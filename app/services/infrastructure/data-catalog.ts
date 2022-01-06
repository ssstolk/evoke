// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright © 2018-2022 Sander Stolk

/* The following interface is in line with W3C DCATv2:
   https://www.w3.org/TR/vocab-dcat-2/#Class:Catalog 
*/
export interface Catalog {
    // identification
    "@id": string; // uri
    "@type": string;
    service: DataService[];
    dataset: Dataset[];
}

/* The following interface is in line with W3C DCATv2:
   https://www.w3.org/TR/vocab-dcat-2/#Class:DataService 
*/
export interface DataService {
    // identification
    "@id": string; // uri
    "@type": string;
    title: string;
    identifier: string;
    // documentation
    landingPage?: string;
    license?: string;
    // coverage
    spatial?: string;
    temporal?: any; // see JSON schema
    // version information
    issued?: string;
    modified?: string;
    // endpoint
    endpointURL: string;
    conformsTo?: string;
    endpointDescription: string;
    // access and authentication
    mode?: "get" | "post";
    auth?: "basic" | null;
    username?: string;
    password?: string;
    // datasets served
    servesDataset: string[];
    // imports
    importURL?: string;
}

/* The following interface is in line with W3C DCATv2:
   https://www.w3.org/TR/vocab-dcat-2/#Class:Dataset 
*/
export interface Dataset {
    // identification
    "@id": string; // uri
    "@type": string;
    title: string;
    identifier: string;
    // documentation
    landingPage?: string;
    license?: string;
    // coverage
    spatial?: string;
    temporal?: any; // see JSON schema
    // version information
    issued?: string;
    modified?: string;
    // dependencies
    requires?: string[];
    // distribution
    distribution: {
        accessService: string;
        accessGraph?: string | string[];
        mediaType?: string;
    };
}
