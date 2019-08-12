import * as ts from 'typescript';
import * as _ from 'lodash';
import * as helpers from '../helpers';

export type Factory = ts.TransformerFactory<ts.SourceFile>;

/**
 * declare class variables
 *
 * @example
 * Before:
 * class a {
 *    constructor(){
 *      this.name = ''
 *    }
 * }
 *
 * After
 * class a {
 *    name: string
 *    constructor(){
 *      this.name = ''
 *    }
 * }
 */
export function classInstanceVariablesTransformFactoryFactory(typeChecker: ts.TypeChecker): Factory {
    return function classInstanceVariablesTransformFactory(context: ts.TransformationContext) {
        return function classInstanceVariablesTransform(sourceFile: ts.SourceFile) {
            const visited = visitSourceFile(sourceFile, typeChecker);
            ts.addEmitHelpers(visited, context.readEmitHelpers());

            return visited;
        };
    };
}

function visitSourceFile(sourceFile: ts.SourceFile, typeChecker: ts.TypeChecker) {
    helpers.visitor(sourceFile.statements, statement => {
        if (ts.isClassExpression(statement) || ts.isClassDeclaration(statement)) {
            const propertyDeclaration = getInstancePropertiesFromClassStatement(statement, typeChecker);
            statement.members = ts.createNodeArray([...propertyDeclaration, ...statement.members]);
        }
    });

    return sourceFile;
}

/**
 * Get properties within constructor
 * @param classStatement
 * @param typeChecker
 */
function getInstancePropertiesFromClassStatement(
    classStatement: ts.ClassExpression | ts.ClassDeclaration,
    typeChecker: ts.TypeChecker,
): Array<ts.PropertyDeclaration> {
    const propertyDeclarations: Array<ts.PropertyDeclaration> = [];
    const memberNames = classStatement.members.map(member => {
        return member.name ? (member.name as ts.Identifier).text : '';
    });
    const expressions = helpers.filter<ts.BinaryExpression | ts.PropertyAccessExpression>(
        classStatement.members,
        node => {
            return ts.isBinaryExpression(node) || ts.isPropertyAccessExpression(node);
        },
    );

    const isReactClass = helpers.isReactComponent(classStatement, typeChecker);

    expressions.forEach((expression: ts.Expression) => {
        let text = '',
            type;
        if (ts.isBinaryExpression(expression)) {
            text = expression.left.getText();
            type = typeChecker.getTypeAtLocation(expression.right);
        } else {
            text = expression.getText();
            type = typeChecker.getTypeAtLocation(expression);
        }

        if (text.indexOf('this.') === 0) {
            const match = text
                .replace(/\(\w{0,}\)/, '')
                .replace(/\[.+\]/, '')
                .replace(/^this\./, '')
                .match(/\w+/);
            if (!match) {
                throw 'fail to analyze propertyName: ' + text;
            }
            const propertyName = match[0];
            const process = isReactClass
                ? propertyName.toLowerCase() !== 'state' &&
                  propertyName.toLowerCase() !== 'props' &&
                  propertyName.toLowerCase() !== 'setstate'
                : true;

            if (
                process &&
                !memberNames.find(name => name === propertyName) &&
                !propertyDeclarations.find(p => (p.name as ts.Identifier).text === propertyName)
            ) {
                const typeString = typeChecker.typeToString(type);
                let typeNode;

                if (text.indexOf('[') >= 0) {
                    typeNode = ts.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword);
                } else if (typeString === 'ReactNode') {
                    typeNode = ts.createTypeReferenceNode('React.ReactNode', []);
                } else if (typeString === 'undefined[]') {
                    typeNode = ts.createArrayTypeNode(ts.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword));
                } else if (typeString === 'false' || typeString === 'true') {
                    typeNode = ts.createKeywordTypeNode(ts.SyntaxKind.BooleanKeyword);
                } else if (typeString === 'Timer' || (type && type.flags === ts.TypeFlags.NumberLiteral)) {
                    typeNode = ts.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword);
                } else if (typeString.match(/"\w{0,}"/)) {
                    typeNode = ts.createKeywordTypeNode(ts.SyntaxKind.StringKeyword);
                } else {
                    typeNode = typeChecker.typeToTypeNode(type);
                }

                const propertyDeclaration = ts.createProperty(
                    [], // decorator
                    [], // modifiter
                    propertyName,
                    undefined,
                    typeNode,
                    undefined,
                );
                propertyDeclarations.push(propertyDeclaration);
            }
        }
    });

    propertyDeclarations.sort(function(a, b) {
        const n = (a.name as ts.Identifier).text;
        const m = (b.name as ts.Identifier).text;
        if (n > m) return 1;
        if (n < m) return -1;
        return 0;
    });

    return propertyDeclarations;
}
