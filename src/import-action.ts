import * as vscode from 'vscode';

import { ImportDb, ImportObject } from './import-db';
import { TsImportDb } from './ts-import-db';

export interface Context {
    document: vscode.TextDocument;
    range: vscode.Range;
    context: vscode.CodeActionContext;
    token: vscode.CancellationToken;
    imports?: Array<ImportObject>
}

export class ImportAction {


    public provideCodeActions(document: vscode.TextDocument, range: vscode.Range,
        context: vscode.CodeActionContext, token: vscode.CancellationToken): vscode.Command[] {

        let actionContext = this.createContext(document, range, context, token);

        if (this.canHandleAction(actionContext)) {
            return this.actionHandler(actionContext, document);
        }
    }

    private canHandleAction(context: Context): boolean {

        let diagnostic: vscode.Diagnostic = context.context.diagnostics[0];

        if (!diagnostic) {
            return false;
        }

        if (diagnostic.message.startsWith('Typescript Cannot find name') || diagnostic.message.startsWith('Cannot find name')) {
            let imp = diagnostic.message.replace('Typescript Cannot find name', '')
                .replace('Cannot find name', '')
                .replace(/{|}|from|import|'|"| |\.|;/gi, '')
                .split('Didyoumean')[0]

            try {
                let found = ImportDb.getImport(imp, context.document.uri);

                if (found) {
                    context.imports = found;
                    return true
                }

            } catch (exception) {
                return false;
            }
        }

        return false;
    }

    private actionHandler(context: Context, document: vscode.TextDocument): vscode.Command[] {
        let path = (imp: ImportObject) => {

            if ((<any>imp.file).discovered) {
                return imp.file.fsPath;
            }
            const pathFromTs = TsImportDb.getTsImport(imp.file.fsPath, document, imp.workspace)
            if (pathFromTs){ 
                return pathFromTs;
            }
        };

        let handlers = [];
        context.imports.forEach(i => {
            handlers.push({
                title: `[AI] Import ${i.name} from ${path(i)}`,
                command: 'extension.fixImport',
                arguments: [context.document, context.range, context.context, context.token, context.imports]
            });
        });

        return handlers;
    }

    private createContext(document: vscode.TextDocument, range: vscode.Range,
        context: vscode.CodeActionContext, token: vscode.CancellationToken): Context {
        return {
            document, range, context, token
        }
    }
}