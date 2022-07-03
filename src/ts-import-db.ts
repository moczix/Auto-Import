import * as FS from 'fs';
import * as vscode from 'vscode';
import * as _ from 'lodash';
import { join } from 'path';


export type TsImportsPaths = Record<string, string[]>;
export type TsImportsBaseUrl = string;

class TsImportDbMemory {
    private static _instance: TsImportDbMemory;

    public importsPath: TsImportsPaths;
    public baseUrl: TsImportsBaseUrl;
    public storage: Record<string, Record<string, string>> = {};

    private constructor() {
        if (TsImportDbMemory._instance) {
            throw new Error("Use Singleton.instance instead of new.");
        }
        TsImportDbMemory._instance = this;
        this.loadConfig();
    }


    public static get instance() {
        return TsImportDbMemory._instance ?? (TsImportDbMemory._instance = new TsImportDbMemory());
    }

    public createTsWatcher() {
        var multiWorkspace = vscode.workspace.workspaceFolders.length > 0;

        if (multiWorkspace === true) {
            vscode.workspace.workspaceFolders.forEach(workspace => {
                const relativePattern = new vscode.RelativePattern(workspace, '**/tsconfig.*.json');
                let watcher = vscode.workspace.createFileSystemWatcher(relativePattern);
                watcher.onDidChange(() => this.reloadConfig())
                watcher.onDidCreate(() => this.reloadConfig())
                watcher.onDidDelete(() => this.reloadConfig())
            });

        } else {
            let watcher = vscode.workspace.createFileSystemWatcher('**/tsconfig.*.json');
            watcher.onDidChange(() => this.reloadConfig())
            watcher.onDidCreate(() => this.reloadConfig())
            watcher.onDidDelete(() => this.reloadConfig())
        }
    }

    public reloadConfig() {
        this.loadConfig();
    }

    public loadConfig() {
        let tsconfigWithPaths = vscode.workspace.getConfiguration('autoimport').get<string>('fileWithTsImports');

        let workspace: vscode.WorkspaceFolder = vscode.workspace.workspaceFolders[0];
        const tsconfig = join(workspace.uri.fsPath, './tsconfig.json');
        if (FS.existsSync(tsconfig)) {
            const parsedTsConfig = JSON.parse(FS.readFileSync(tsconfig, { encoding: 'utf-8' }));
            if (Object.keys(parsedTsConfig?.compilerOptions?.paths ?? {}).length > 0) {
                this.importsPath = parsedTsConfig.compilerOptions.paths;
            }
            if (parsedTsConfig?.compilerOptions?.baseUrl) {
                this.baseUrl = join(workspace.uri.fsPath, parsedTsConfig.compilerOptions.baseUrl);
            }
        }
        const tsconfigBase = join(workspace.uri.fsPath, tsconfigWithPaths);
        if (FS.existsSync(tsconfigBase)) {
            const parsedTsConfig = JSON.parse(FS.readFileSync(tsconfigBase, { encoding: 'utf-8' }));
            if (Object.keys(parsedTsConfig?.compilerOptions?.paths ?? {}).length > 0) {
                this.importsPath = parsedTsConfig.compilerOptions.paths;
            }
            if (parsedTsConfig.compilerOptions.baseUrl) {
                this.baseUrl = join(workspace.uri.fsPath, parsedTsConfig.compilerOptions.baseUrl);
            }
        }
    }

}


export class TsImportDb {

    public static createTsWatcher(): void {
        TsImportDbMemory.instance.createTsWatcher();
    }

    public static saveTsImport(file: vscode.Uri, workspace: vscode.WorkspaceFolder) {
        if (!TsImportDbMemory.instance.storage[workspace.uri.fsPath]) {
            TsImportDbMemory.instance.storage[workspace.uri.fsPath] = {};
        }
        const storage = TsImportDbMemory.instance.storage[workspace.uri.fsPath]
        const importsPath = TsImportDbMemory.instance.importsPath;
        const baseUrl = TsImportDbMemory.instance.baseUrl;

        for (const importPathKey of Object.keys(importsPath)) {
            if (!importPathKey.endsWith('/*')) {
                continue;
            }
            const importPathKeyNormalized = importPathKey.slice(0, -1)
            for (const path of importsPath[importPathKey]) {
                const pathNormalized = join(baseUrl, path.slice(0, -1));
                if (path.endsWith('/*') && file.fsPath.startsWith(pathNormalized)) {
                    let finalPath = join(importPathKeyNormalized, file.fsPath.replace(pathNormalized, ''))
                    if (finalPath.endsWith('.ts')) {
                        finalPath = finalPath.slice(0, -3)
                    }
                    storage[file.fsPath] = finalPath;
                }
            }
        }
    }

    public static getTsImport(fsPath: string, workspace: vscode.WorkspaceFolder): string | undefined {
        return TsImportDbMemory.instance.storage[workspace.uri.fsPath]?.[fsPath];
    }

}