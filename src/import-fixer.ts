import * as vscode from 'vscode'
import * as path from 'path';

import { ImportObject } from './import-db';
import { TsImportDb } from './ts-import-db';

export class ImportFixer {

    private spacesBetweenBraces;
    private doubleQuotes;
    private useSemiColon;

    constructor() {
        let config = vscode.workspace.getConfiguration('autoimport');

        this.useSemiColon = config.get<boolean>('useSemiColon');
        this.spacesBetweenBraces = config.get<boolean>('spaceBetweenBraces');
        this.doubleQuotes = config.get<boolean>('doubleQuotes');
    }

    public fix(document: vscode.TextDocument, range: vscode.Range,
        context: vscode.CodeActionContext, token: vscode.CancellationToken, imports: Array<ImportObject>): void {

        let edit = this.getTextEdit(document, imports);

        vscode.workspace.applyEdit(edit);
    }

    public getTextEdit(document: vscode.TextDocument, imports: Array<ImportObject>) {

        let edit: vscode.WorkspaceEdit = new vscode.WorkspaceEdit();
        let importObj: vscode.Uri = imports[0].file;
        let importName: string = imports[0].name;


        const tsImportPath = TsImportDb.getTsImport(importObj.fsPath, imports[0].workspace);
        if (!tsImportPath){
            return edit;
        }

        if (this.alreadyResolved(document, tsImportPath, importName)) {
            return edit;
        }
        if (this.shouldMergeImport(document, tsImportPath)) {
            edit.replace(document.uri, new vscode.Range(0, 0, document.lineCount, 0),
                this.mergeImports(document, edit, importName, importObj, tsImportPath));
        } else {
            edit.insert(document.uri, new vscode.Position(0, 0),
                this.createImportStatement(imports[0].name, tsImportPath, true));
        }
        
        return edit;
    }

    private alreadyResolved(document: vscode.TextDocument, tsImportPath, importName) {

        let exp = new RegExp('(?:import\ \{)(?:.*)(?:\}\ from\ \')(?:' + tsImportPath + ')(?:\'\;)')

        let currentDoc = document.getText();

        let foundImport = currentDoc.match(exp)

        if (foundImport && foundImport.length > 0 && foundImport[0].indexOf(importName) > -1) {
            return true;
        }

        return false;
    }

    private shouldMergeImport(document: vscode.TextDocument, tsImportPath): boolean {
        let currentDoc = document.getText();

        let isCommentLine = (text: string): boolean => {
            let firstTwoLetters = text.trim().substr(0, 2);
            return firstTwoLetters === '//' || firstTwoLetters === '/*';
        }

        return currentDoc.indexOf(tsImportPath) !== -1 && !isCommentLine(currentDoc);
    }

    private mergeImports(document: vscode.TextDocument, edit: vscode.WorkspaceEdit, name, file, tsImportPath: string) {

        let exp = this.useSemiColon === true ?
            new RegExp('(?:import\ \{)(?:.*)(?:\}\ from\ \')(?:' + tsImportPath + ')(?:\'\;)') :
            new RegExp('(?:import\ \{)(?:.*)(?:\}\ from\ \')(?:' + tsImportPath + ')(?:\'\)')

        let currentDoc = document.getText();

        let foundImport = currentDoc.match(exp)

        if (foundImport) {
            let workingString = foundImport[0];

            let replaceTarget = this.useSemiColon === true ?
                /{|}|from|import|'|"| |;/gi :
                /{|}|from|import|'|"| |/gi;

            workingString = workingString
                .replace(replaceTarget, '').replace(tsImportPath, '');

            let importArray = workingString.split(',');

            importArray.push(name)

            let newImport = this.createImportStatement(importArray.join(', '), tsImportPath);

            currentDoc = currentDoc.replace(exp, newImport);
        }

        return currentDoc;
    }

    private createImportStatement(imp: string, path: string, endline: boolean = false): string {

        let formattedPath = path.replace(/\"/g, '')
            .replace(/\'/g, '');

        let returnStr = '';

        if ((this.doubleQuotes) && (this.spacesBetweenBraces)) {
            returnStr = `import { ${imp} } from "${formattedPath}";${endline ? '\r\n' : ''}`;
        } else if (this.doubleQuotes) {
            returnStr = `import {${imp}} from "${formattedPath}";${endline ? '\r\n' : ''}`;
        } else if (this.spacesBetweenBraces) {
            returnStr = `import { ${imp} } from '${formattedPath}';${endline ? '\r\n' : ''}`;
        } else {
            returnStr = `import {${imp}} from '${formattedPath}';${endline ? '\r\n' : ''}`;
        }


        if (this.useSemiColon === false) {
            returnStr = returnStr.replace(';', '');
        }

        return returnStr;
    }
}