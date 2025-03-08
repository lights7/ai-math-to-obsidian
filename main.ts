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
const terms = ["\\", "_", "^", "=", "+", "/","\∂","\√"];
let p1="";
if (input.includes("\\\\[") || input.includes("\\\\(")) { // from Liner 
  input = input.replace(/\\\\\((.*?)\\\\\)/g, (_match, p1) => {
    return `$${p1.trim()}$`;
  });
  // Replace \[\text{sample}\] with $$\text{sample}$$
  input = input.replace(/\\\\\[(.*?)\\\\\]/gs, (_match, p1) => {
    return `\n$$\n${p1.trim()}\n$$\n`;
  });
  return input; // return ChatGPT

}else if (input.includes("\\\[") || input.includes("\\\(")) { // from ChatGPT
  input = input.replace(/\\\((.*?)\\\)/g, (_match, p1) => {
    return `$${p1.trim()}$`;
  });
  // Replace \[\text{sample}\] with $$\text{sample}$$
  input = input.replace(/\\\[(.*?)\\\]/gs, (_match, p1) => {
    return `\n$$\n${p1.trim()}\n$$\n`;
  });
  return input; // return ChatGPT

}else if( input.includes("\\")) {    // input from Grok
  m=0; // previous line is equ if 1, no math equ if 0
  all=""
  equ = 0;
  math = 0;
  string_math_space_ratio = 0.75;
  math_string_ratio = 0.1;
/*  all_space_len=(p1.match(new RegExp(" ", "g")) || []).length;
  p1_no_space=p1.replaceAll(" + ", '').replaceAll(" - ",'').replaceAll(" = ",''); // remove certain space  and +-=
  str_space_len=(p1_no_space.match(new RegExp(" ", "g")) || []).length;
  slash_num=(p1_no_space.match(/\\/g) || []).length;
  sub_num=(p1_no_space.match(/\_/g) || []).length;
  console.log(p1_no_space,str_space_len,all_space_len,slash_num,sub_num,len)
*/
//  if(str_space_len/all_space_len>string_math_space_ratio && (slash_num+sub_num)<3){
  const lines=input.split(/\r?\n/);
  for (p1 of lines) {
    len=p1.length;
/*    if(str_space_len/all_space_len>string_math_space_ratio && (slash_num+sub_num)<3){
      math=0;
    }else{
      math=1;
    }
*/
    if(p1.includes("=")){
       if(p1.includes("\\") && p1.includes("\_")){
         math=2;
       } else if(p1.includes("\\") || p1.includes("\_")){
         math=2;
       }else{
         math=0;
       }
      }else{
       if(p1.includes("\\") && p1.includes("\_")){
         math=1;
       } else if(p1.includes("\\") || p1.includes("\_")){
         math=1;
       }else{
         math=0;
       }
      }

    if(p1.includes("=")){
       equ = 1;
    }else{
       equ = 0;
    }
    if (len == 1 && m==0) { // this line is short equ, no equ in previous
      all=all+"\$"+p1+"\$";
      m=1;
    } else if (len < 12 && terms.some((term) => p1.includes(term))) {
      all=all+"\$"+p1+"\$";
      m=1;
    } else if (math == 1 && len >= 12 && len<=20 && terms.some((term) => p1.includes(term))) {
      all=all+"\$"+p1+"\$";
      m=1;
    } else if (math == 2 && len >= 12 && len<=20 && terms.some((term) => p1.includes(term))) {
      all=all+"\$"+p1+"\$";
      m=1;
//    } else if (math == 2 && len >= 12 && terms.some((term) => p1.includes(term))) {
//      all=all+p1;
//      m=0;
    } else if (math == 2 && len >= 12 && terms.some((term) => p1.includes(term))) {
      all=all+"\$\$"+p1+"\$\$";
      m=2;
    } else { // this line is not equation
//      if(math>0){console.log("p1",p1)}
        all=all+p1+'\n\n';
      m=0
    }
  }
  input = all;
  return input;
}else{ // input from Llama and Claude
  m=0; // previous line is equ if 1, no math equ if 0
  all=""
  equ = 0;
  math = 0;
  string_math_space_ratio = 0.75;
  math_string_ratio = 0.1;
  const lines=input.split(/\r?\n/);
  for (p1 of lines) {
    len=p1.length;
    //console.log("removed space",p1.replace(/\ +\ |\ -\ |\ =\ /g,""))
    all_space_len=(p1.match(new RegExp(" ", "g")) || []).length;
    p1_no_space=p1.replaceAll(" + ", '').replaceAll(" - ",'').replaceAll(" = ",''); // remove certain space  and +-=
    str_space_len=(p1_no_space.match(new RegExp(" ", "g")) || []).length;
    slash_num=(p1_no_space.match(/\\/g) || []).length;
    sub_num=(p1_no_space.match(/\_/g) || []).length;
//    console.log(p1_no_space,str_space_len,all_space_len,slash_num,sub_num,len)
    if(str_space_len/all_space_len>string_math_space_ratio && (slash_num+sub_num)<3){
      math=0;
    }else{
      math=1;
    }

    if(p1.includes("=")){
       equ = 1;
    }else{
       equ = 0;
    }

    if (len == 1 && m==0) { // this line is short equ, no equ in previous
      all=all+"\$"+p1+"\$";
      m=1;
    } else if (len < 12 && terms.some((term) => p1.includes(term))) {
      all=all+"\$"+p1+"\$";
      m=1;
    } else if (equ == 0 && len >= 12 && len<=20 && terms.some((term) => p1.includes(term))) {
      all=all+"\$"+p1+"\$";
      m=1;
    } else if (math == 0 && equ == 1 && len >= 12 && terms.some((term) => p1.includes(term))) {
      all=all+p1;
      m=0;
    } else if (math == 1 && equ == 1 && len >= 12 && terms.some((term) => p1.includes(term))) {
      all=all+"\$\$"+p1+"\$\$";
      m=2;
    } else { // this line is not equation
        all=all+p1+'\n';
      m=0
    }
    input=all;
    return input; 
  };
}
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
