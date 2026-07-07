import { LanguageSupport } from '@codemirror/language';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import { Highlight, Wikilink, Embed, Tag, Frontmatter } from './extensions';

export function unvaultedMarkdown(): LanguageSupport {
  return markdown({
    base: markdownLanguage,
    codeLanguages: languages,
    extensions: [Highlight, Wikilink, Embed, Tag, Frontmatter]
  });
}
