// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright © 2018-2022 Sander Stolk

import * as uuid from "uuid";

export class RandomHelper {
    public static getRandomInt(minValue: number, maxValue: number) {
        return Math.round(Math.random() * (maxValue - minValue) + minValue);
    }

    public static getRandomUUID(): string {
        return uuid.v4();
    }

    public static getRandomWord(wordMinLength: number = 6, wordMaxLength?: number): string {
        wordMaxLength = wordMaxLength || wordMinLength;
        const vows = "awoeuyijo";
        const cons = "qrtpsdfghklzxcvbnm";
        const symbolsCount = RandomHelper.getRandomInt(wordMinLength, wordMaxLength);
        let result = "";
        const firstVowOrCon = RandomHelper.getRandomInt(0, 1);
        for (let i = 0; i < symbolsCount; ++i) {
            result +=
                i % 2 == firstVowOrCon
                    ? vows[RandomHelper.getRandomInt(0, vows.length - 1)]
                    : cons[RandomHelper.getRandomInt(0, cons.length - 1)];
        }
        return result;
    }

    public static getRandomPhrase(phraseMinLength: number = 3, phraseMaxLength?: number): string {
        phraseMaxLength = phraseMaxLength || phraseMinLength;
        const words: string[] = [];
        const phraseLength = RandomHelper.getRandomInt(phraseMinLength, phraseMaxLength);
        for (let i = 0; i < phraseLength; ++i) {
            words.push(RandomHelper.getRandomWord(4, 7));
        }
        return words.join(" ");
    }

    public static async resolveWithDelay<T>(
        data: T,
        minDelay: number = 400,
        maxDelay: number = 1500
    ): Promise<T> {
        const promise = new Promise<T>((resolve, reject) => {
            setTimeout(() => {
                resolve(data);
            }, RandomHelper.getRandomInt(400, 1500));
        });
        return promise;
    }
}
