// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright © 2018-2022 Sander Stolk

import iso639_codes from "app/data/iso-639-3_20200130";

export class LanguageHelper {
    static getLanguageName(langCode?: string, removeParentheses = true): string | undefined {
        if (langCode && iso639_codes.hasOwnProperty(langCode)) {
            const name = (iso639_codes as any)[langCode];
            return !removeParentheses ? name : name.replace(/\s*[(][^)]*[)]$/g, "");
        }
        return undefined;
    }
}
