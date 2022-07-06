import { Project } from "ts-morph";
import * as vscode from "vscode";


export class TsReferences implements vscode.ReferenceProvider {
  constructor(private _tsMorphProject: Project) {
  }

  public provideReferences(
    document: vscode.TextDocument,
    position: vscode.Position,
    context: vscode.ReferenceContext,
    token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.Location[]> {
    const languageService = this._tsMorphProject.getLanguageService();

    const file = this._tsMorphProject.getSourceFile(document.fileName);

    const pos = file.compilerNode.getPositionOfLineAndCharacter(
      position.line,
      position.character
    );
    const elementNode = file.getDescendantAtPos(pos);

    const locations: vscode.Location[] = [];

    for (const reference of languageService.findReferences(elementNode)) {
      const def = reference.getDefinition();
      const lineAndColumnStart = def
        .getSourceFile()
        .getLineAndColumnAtPos(def.getNode().getStart());
      const lineAndColumnEnd = def
        .getSourceFile()
        .getLineAndColumnAtPos(def.getNode().getEnd());
      locations.push(
        new vscode.Location(
          vscode.Uri.parse(def.getSourceFile().getFilePath()),
          new vscode.Range(
            new vscode.Position(
              lineAndColumnStart.line - 1,
              lineAndColumnStart.column - 1
            ),
            new vscode.Position(
              lineAndColumnEnd.line - 1,
              lineAndColumnEnd.column - 1
            )
          )
        )
      );
    }
    return locations;

  }
}
