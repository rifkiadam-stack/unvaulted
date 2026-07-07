import { LanguageSupport } from '@codemirror/language';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';

export function unvaultedMarkdown(): LanguageSupport {
  return markdown({
    base: markdownLanguage,
    codeLanguages: languages,
    extensions: []
  });
}
