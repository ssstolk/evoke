// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright © 2018-2022 Sander Stolk

interface Abstract<T> {
    prototype: T;
}

const container: {
    id: Object;
    implementation: Object;
}[] = [];

export function setupInject<T>(serviceIdentifier: Abstract<T>, implementation: T | T[]) {
    const match = container.find(r => r.id === serviceIdentifier);
    if (match) {
        match.implementation = implementation;
    } else {
        container.push({
            id: serviceIdentifier,
            implementation: implementation
        });
    }
}

export function resolveInject<T>(serviceIdentifier: Abstract<T>): T {
    const match = container.find(r => r.id === serviceIdentifier);
    if (match) {
        const result = match.implementation;
        if (Array.isArray(result)) {
            throw new Error("Requested binding is an array whereas a single object was expected");
        }
        return result as T;
    }
    throw new Error("Requested binding is not registered in DI container");
}

export function resolveInjectArray<T>(serviceIdentifier: Abstract<T>): T[] {
    const match = container.find(r => r.id === serviceIdentifier);
    if (match) {
        const result = match.implementation;
        if (Array.isArray(result)) {
            return result as T[];
        }
        throw new Error("Requested binding is a single object whereas an array was expected");
    }
    throw new Error("Requested binding is not registered in DI container");
}
