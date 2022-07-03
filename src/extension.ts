import * as vscode from 'vscode';

import { ErrorHelper } from './helpers/error-helper';
import { AutoImport } from './auto-import';
import { TsImportDb } from './ts-import-db';

export function activate(context: vscode.ExtensionContext) {

    try {

        if (context.workspaceState.get('auto-import-settings') === undefined) {
            context.workspaceState.update('auto-import-settings', {});
        }

        let extension = new AutoImport(context);

        let start = extension.start();

        if (!start) {
            return;
        }

        TsImportDb.createTsWatcher();

        extension.attachCommands();

        extension.attachFileWatcher();

        extension.scanIfRequired();


    } catch (error) {
        ErrorHelper.handle(error);
    }

}

export function deactivate() {

}