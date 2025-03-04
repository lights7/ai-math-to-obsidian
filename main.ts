import { App, Notice, Plugin , PluginSettingTab, Setting } from "obsidian";

interface Katex2MathjaxConverterSettings {
  enableDefaultPasteConversion: boolean;
}

const DEFAULT_SETTINGS: Katex2MathjaxConverterSettings = {
  enableDefaultPasteConversion: true,
};

export default class Katex2MathjaxConverterPlugin extends Plugin {
  settings: Katex2MathjaxConverterSettings;

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  async onload() {
    // Load plugin settings
    await this.loadSettings();

    // Add settings tab
    this.addSettingTab(new MathJaxConverterSettingTab(this.app, this));

    // Event for default paste based on the settings 'enableDefaultPasteConversion' value
    this.registerEvent(
      this.app.workspace.on("editor-paste", async (evt, editor) => {
        const clipboardText = evt.clipboardData?.getData("text") || ""
        const convertedText = this.settings.enableDefaultPasteConversion
          ? convertKatexToMathJax(clipboardText)
          : clipboardText;

          if (clipboardText) {
            evt.preventDefault();
            editor.replaceSelection(convertedText);
          }
        
      })
    );

    // Command: Paste with conversion
    this.addCommand({
      id: "paste-katex-to-mathjax",
      name: "Paste with conversion",
      editorCallback: (editor) => {
        navigator.clipboard.readText().then((clipboardText) => {
          const convertedText = convertKatexToMathJax(clipboardText)
          editor.replaceSelection(convertedText);
        });
      },
    });

    // Command: Convert existing text in the editor from KaTeX to MathJax
    this.addCommand({
      id: "convert-editor-text-from",
      name: "Convert current text file",
      editorCallback: (editor) => {
        const currentText = editor.getValue();
        const convertedText = convertKatexToMathJax(currentText);
        editor.setValue(convertedText);
      },
    });

    // Command: Convert all files in the vault from KaTeX to MathJax
    this.addCommand({
      id: "convert-all-files-from",
      name: "Convert all files",
      callback: async () => {
        const files = this.app.vault.getMarkdownFiles();
        for (const file of files) {
          const content = await this.app.vault.read(file);
          const convertedContent = convertKatexToMathJax(content);
          await this.app.vault.modify(file, convertedContent);
        }
        new Notice("Text in the whole vault is converted from KaTeX to MathJax format!");
      },
    });
  }
}

/**
 * Converts KaTeX formatted strings to MathJax formatted strings.
 * 
 * This function performs the following conversions:
 * 1. Replaces \(\text{sample}\) with $\text{sample}$.
 * 2. Replaces \[\text{sample}\] with $$\text{sample}$$.
 * 
 * @param input - The input string containing KaTeX formatted text.
 * @returns The converted string with MathJax formatted text.
 */
function convertKatexToMathJax(input: string): string {
//  input = input.replace(/^(.*?)$|/^(.*?)$/gm, function(p1,p2) {
  m=0; // previous line is math if 1, no math if 0
  p0=""; // previous line
  n="\n";
 // const lines=input.split(/\r?\n/);
//  for (const line of lines) {
//    console.log(line);
//  }
  input = input.replace(/^(.*?)$/gm, function(p1) {
    const terms = ["\\", "_", "^", "=", "+", "/"];
    p0=p1;
    console.log("p1", p1.length);
    console.log("p0", p0.length);
    if (p1.length == 1 && m==0) { // math this line, no math previous
//      p1=p1.replace(/\n|\r/g,'');
      p1=p1.replace(/^/,"W");
//      p1=p1.replace(/[\n\t\r]/,'B');
      console.log(p1.trim());
      m=1;
      return `$${p1.trim()}$`;
    } else if (p1.length <= 20 && terms.some((term) => p1.includes(term))) {
 //     p1=p1.replace(/^\s+|\s+$/g);
//      console.log(p1.trim());
//      p1=p1.replace(/\n|\r/g,'');
//      p1=p1.replace(/[\n+]/g,'');
      p1=p1.replace(/$/g,'');
      m=1;
      return `$${p1.trim()}$`;
//      return `${p0.trim()} $${p1.trim()}$`;
//      return `$${p1.trim()}$`;
    } else if (p1.length > 20 && terms.some((term) => p1.includes(term))) {
      m=2;
      return `$$${p1.trim()}$$`;
//      return `${p0} $${p1.trim()}$`;
//      return `$$${p1.trim()}$$`;
    } else {
      m=0
//      p1=p1.replace(/[\n\t\r]/g,'');
      p1=p1.replace(/ $/,' ');
      if (m==1){ //previous line is short math, this line is not math
        return `${p1}`;
      }else if(m==2){
        return `${n} ${p1}`;
      }else{ //m=0 previous and this line are not math
        return `${p1}`;
//        return `${n} ${p1}`;
 
      }
//      p1=p1.replace(/\n/g,"");
      m=0;
      return `${p2} $${p1}$`;
//      return `${p1.trim()}`;
    }
  });

  input = input.replace(/\\\((.*?)\\\)/g, (_match, p1) => {
//    console.log("p1",p1.trim());
    return `$${p1.trim()}$`;
  });
  // Replace \[\text{sample}\] with $$\text{sample}$$
  input = input.replace(/\\\[(.*?)\\\]/gs, (_match, p1) => {
//    console.log("p1",p1.trim());
    return `\n$$\n${p1.trim()}\n$$\n`;
  });
  return input;
}

/**
 * Settings tab for the MathJax Converter Plugin.
 * 
 * This class creates a settings tab in the application where users can
 * configure the plugin settings.
 */
class MathJaxConverterSettingTab extends PluginSettingTab {
  plugin: Katex2MathjaxConverterPlugin;

  /**
   * Constructs a new instance of the settings tab.
   * 
   * @param app - The application instance.
   * @param plugin - The plugin instance.
   */
  constructor(app: App, plugin: Katex2MathjaxConverterPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  /**
   * Displays the settings tab.
   * 
   * This method creates the UI elements for the settings tab and sets up
   * event listeners for user interactions.
   */
  display(): void {
    const { containerEl } = this;

    containerEl.empty();

    // Toggle for enabling/disabling default paste conversion
    new Setting(containerEl)
      .setName("Enable default paste conversion")
      .setDesc("Automatically converts KaTeX to MathJax on paste action.")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.enableDefaultPasteConversion)
          .onChange(async (value) => {
            this.plugin.settings.enableDefaultPasteConversion = value;
            await this.plugin.saveSettings();
          })
      );
  }
}