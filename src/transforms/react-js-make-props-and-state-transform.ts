import * as ts from 'typescript';
import * as _ from 'lodash';
import * as helpers from '../helpers';

export type Factory = ts.TransformerFactory<ts.SourceFile>;

/**
 * Get transform for transforming React code originally written in JS which does not have
 * props and state generic types
 * This transform will remove React component static "propTypes" member during transform
 */
export function reactJSMakePropsAndStateInterfaceTransformFactoryFactory(typeChecker: ts.TypeChecker): Factory {
    return function reactJSMakePropsAndStateInterfaceTransformFactory(context: ts.TransformationContext) {
        return function reactJSMakePropsAndStateInterfaceTransform(sourceFile: ts.SourceFile) {
            const visited = visitSourceFile(sourceFile, typeChecker);
            ts.addEmitHelpers(visited, context.readEmitHelpers());

            return visited;
        };
    };
}

function visitSourceFile(sourceFile: ts.SourceFile, typeChecker: ts.TypeChecker) {
    let newSourceFile = sourceFile;
    for (const statement of sourceFile.statements) {
        if (ts.isClassDeclaration(statement) && helpers.isReactComponent(statement, typeChecker)) {
            newSourceFile = visitReactClassDeclaration(statement, newSourceFile, typeChecker);
        }
    }

    return newSourceFile;
}

function visitReactClassDeclaration(
    classDeclaration: ts.ClassDeclaration,
    sourceFile: ts.SourceFile,
    typeChecker: ts.TypeChecker,
) {
    if (!classDeclaration.heritageClauses || !classDeclaration.heritageClauses.length) {
        return sourceFile;
    }
    const className = classDeclaration && classDeclaration.name && classDeclaration.name.getText(sourceFile);
    const propType = getPropsTypeOfReactComponentClass(classDeclaration, sourceFile); // qwert
    const props = getPropsOfReactComponentClass(classDeclaration, sourceFile);
    const interfaceMembers = _.unionBy([...propType.members, ...props], p =>
        p.name ? (p.name as ts.Identifier).text : '',
    );
    const states = getStatesOfReactComponentClass(classDeclaration, typeChecker);
    const shouldMakePropTypeDeclaration = interfaceMembers.length > 0;
    const shouldMakeStateTypeDeclaration = !isStateMemberEmpty(states);
    const propTypeName = `I${className}Props`;
    const stateTypeName = `${className}State`;
    const interfaceHeritageClause = createInterfaceHeritageClause();
    const propsInterfaceDeclaration = ts.createInterfaceDeclaration(
        [],
        [],
        propTypeName,
        [],
        [interfaceHeritageClause],
        interfaceMembers,
    );

    const stateTypeDeclaration = ts.createTypeAliasDeclaration([], [], stateTypeName, [], states);
    const propTypeRef = ts.createTypeReferenceNode(propTypeName, []);
    const stateTypeRef = ts.createTypeReferenceNode(stateTypeName, []);

    let newClassDeclaration = getNewReactClassDeclaration(
        classDeclaration,
        shouldMakePropTypeDeclaration ? propTypeRef : ts.createTypeLiteralNode([]),
        shouldMakeStateTypeDeclaration ? stateTypeRef : ts.createTypeLiteralNode([]),
    );

    const allTypeDeclarations = [];
    if (shouldMakePropTypeDeclaration) allTypeDeclarations.push(propsInterfaceDeclaration);
    if (shouldMakeStateTypeDeclaration) allTypeDeclarations.push(stateTypeDeclaration);

    let statements = helpers.insertBefore(sourceFile.statements, classDeclaration, allTypeDeclarations);

    statements = helpers.replaceItem(statements, classDeclaration, newClassDeclaration);
    return ts.updateSourceFileNode(sourceFile, statements);
}

function getNewReactClassDeclaration(
    classDeclaration: ts.ClassDeclaration,
    propTypeRef: ts.TypeNode,
    stateTypeRef: ts.TypeNode,
) {
    if (!classDeclaration.heritageClauses || !classDeclaration.heritageClauses.length) {
        return classDeclaration;
    }

    const firstHeritageClause = classDeclaration.heritageClauses[0];

    const newFirstHeritageClauseTypes = helpers.replaceItem(
        firstHeritageClause.types,
        firstHeritageClause.types[0],
        ts.updateExpressionWithTypeArguments(
            firstHeritageClause.types[0],
            [propTypeRef, stateTypeRef],
            firstHeritageClause.types[0].expression,
        ),
    );

    const newHeritageClauses = helpers.replaceItem(
        classDeclaration.heritageClauses,
        firstHeritageClause,
        ts.updateHeritageClause(firstHeritageClause, newFirstHeritageClauseTypes),
    );

    return ts.updateClassDeclaration(
        classDeclaration,
        classDeclaration.decorators,
        classDeclaration.modifiers,
        classDeclaration.name,
        classDeclaration.typeParameters,
        newHeritageClauses,
        classDeclaration.members,
    );
}

function getPropsTypeOfReactComponentClass(
    classDeclaration: ts.ClassDeclaration,
    sourceFile: ts.SourceFile,
): ts.TypeLiteralNode {
    const staticPropTypesMember = _.find(classDeclaration.members, member => {
        return (
            ts.isPropertyDeclaration(member) &&
            helpers.hasStaticModifier(member) &&
            helpers.isPropTypesMember(member, sourceFile)
        );
    });

    if (
        staticPropTypesMember !== undefined &&
        ts.isPropertyDeclaration(staticPropTypesMember) && // check to satisfy type checker
        staticPropTypesMember.initializer &&
        ts.isObjectLiteralExpression(staticPropTypesMember.initializer)
    ) {
        return helpers.buildInterfaceFromPropTypeObjectLiteral(staticPropTypesMember.initializer);
    }

    const staticPropTypesGetterMember = _.find(classDeclaration.members, member => {
        return (
            ts.isGetAccessorDeclaration(member) &&
            helpers.hasStaticModifier(member) &&
            helpers.isPropTypesMember(member, sourceFile)
        );
    });

    if (
        staticPropTypesGetterMember !== undefined &&
        ts.isGetAccessorDeclaration(staticPropTypesGetterMember) // check to satisfy typechecker
    ) {
        const returnStatement = _.find(staticPropTypesGetterMember.body!.statements, statement =>
            ts.isReturnStatement(statement),
        );
        if (
            returnStatement !== undefined &&
            ts.isReturnStatement(returnStatement) && // check to satisfy typechecker
            returnStatement.expression &&
            ts.isObjectLiteralExpression(returnStatement.expression)
        ) {
            return helpers.buildInterfaceFromPropTypeObjectLiteral(returnStatement.expression);
        }
    }

    return ts.createTypeLiteralNode([]);
}

function getStatesOfReactComponentClass(
    classDeclaration: ts.ClassDeclaration,
    typeChecker: ts.TypeChecker,
): ts.TypeNode {
    const members: ts.PropertySignature[] = [];
    const addMember = (name: ts.Identifier) => {
        const text = name ? name.text : '';
        if (text && !members.find(m => (m.name as ts.Identifier).text === text)) {
            const type = typeChecker.getTypeAtLocation(name);
            const member = ts.createPropertySignature(
                [],
                text,
                ts.createToken(ts.SyntaxKind.QuestionToken),
                typeChecker.typeToTypeNode(type),
                undefined,
            );
            members.push(member);
        }
    };

    for (const member of classDeclaration.members) {
        const node = [member];

        // constructor this.state = {}
        const initialState = helpers.filter<ts.ExpressionStatement>(node, n => {
            return ts.isExpressionStatement(n) &&
                ts.isBinaryExpression(n.expression) &&
                ts.isObjectLiteralExpression(n.expression.right) &&
                n.expression.left.getText().match(/this\.state/)
                ? true
                : false;
        });

        initialState.forEach(s => {
            const expression = s.expression as ts.BinaryExpression;
            const objectLiteral = expression.right as ts.ObjectLiteralExpression;
            objectLiteral.properties.forEach((p: any) => {
                addMember(p.name);
            });
        });

        // argument of setState
        const setStateArguments = helpers
            .filter<ts.CallExpression>(node, n => {
                return ts.isCallExpression(n) &&
                    n.expression.getText().match(/\.setState/) &&
                    n.arguments[0] &&
                    ts.isObjectLiteralExpression(n.arguments[0])
                    ? true
                    : false;
            })
            .map(n => n.arguments[0] as ts.ObjectLiteralExpression);

        setStateArguments.forEach(arg => {
            arg.properties.forEach((p: any) => {
                addMember(p.name);
            });
        });

        // varaible declaration like const { a } = this.state
        const variableDeclarations = helpers.filter<ts.VariableDeclaration>(node, n => {
            return ts.isVariableDeclaration(n) &&
                n.initializer &&
                n.initializer.getText().match(/this\.state/) &&
                n.name &&
                (n.name as any).elements
                ? true
                : false;
        });

        variableDeclarations.forEach(v => {
            (v.name as any).elements.forEach((el: any) => {
                addMember(el.name);
            });
        });

        // property access expresion like this.state.a
        const propertyAccessExpressions = helpers.filter<ts.PropertyAccessExpression>(node, n => {
            return ts.isPropertyAccessExpression(n) && n.getText().match(/this\.state\./) ? true : false;
        });

        propertyAccessExpressions.forEach(p => {
            addMember(p.name);
        });
    }

    return ts.createTypeLiteralNode(members);
}

function isStateMemberEmpty(stateType: ts.TypeNode): boolean {
    // Only need to handle TypeLiteralNode & IntersectionTypeNode
    if (ts.isTypeLiteralNode(stateType)) {
        return stateType.members.length === 0;
    }

    if (!ts.isIntersectionTypeNode(stateType)) {
        return true;
    }

    return stateType.types.every(isStateMemberEmpty);
}

/**
 * interface extends React.HTMLAttributes<Element>
 */
function createInterfaceHeritageClause() {
    const expression = ts.createPropertyAccess(ts.createIdentifier('React'), 'HTMLAttributes');
    const typeReference = ts.createTypeReferenceNode('Element', []);
    const expressionWithTypeArguments = ts.createExpressionWithTypeArguments([typeReference], expression);
    return ts.createHeritageClause(ts.SyntaxKind.ExtendsKeyword, [expressionWithTypeArguments]);
}

function getPropsOfReactComponentClass( // qwert
    classDeclaration: ts.ClassDeclaration,
    sourceFile: ts.SourceFile,
): ts.PropertySignature[] {
    const names: string[] = [];

    const variableDeclarations = helpers.filter<ts.VariableDeclaration>(classDeclaration.members, node => {
        return ts.isVariableDeclaration(node) && node.initializer && node.initializer.getText() === 'this.props'
            ? true
            : false;
    });

    variableDeclarations.forEach(node => {
        if ((node.name as any).elements) {
            (node.name as any).elements.forEach((el: ts.BindingElement) => {
                const name = (el.propertyName || el.name) as ts.Identifier;
                names.push(name.text);
            });
        }
    });

    const propertyAccessExpressions = helpers.filter<ts.PropertyAccessExpression>(classDeclaration.members, node => {
        return ts.isPropertyAccessExpression(node) && node.getText().indexOf('this.props.') === 0;
    });

    propertyAccessExpressions.forEach(node => {
        names.push(node.name.text);
    });

    const propsSignatures = names.map(name => {
        return ts.createPropertySignature(
            [],
            name,
            ts.createToken(ts.SyntaxKind.QuestionToken),
            ts.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword),
            undefined,
        );
    });
    return propsSignatures;
}
