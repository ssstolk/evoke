// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright © 2018-2022 Sander Stolk

import { LOCAL_STORAGE_DATASET } from "app/services/infrastructure/sparql-executor";
import { TextEncoder } from "text-encoding";

export class FileHelper {
    public static downloadFile(name: string, content: string, type?: string) {
        //const dataURI = "data:text/text;charset=utf-8," + encodeURIComponent(content);
        //File.downloadViaAhref(name, dataURI);

        const blob = FileHelper.contentToBlob(content);
        FileHelper.downloadViaAhref(name, URL.createObjectURL(blob));
    }

    public static dataURIToBlob(dataURI: string) {
        const content = dataURI.split(",")[1];
        return FileHelper.contentToBlob(content);
    }

    public static contentToBlob(content: string) {
        const bytes = new TextEncoder().encode(content);
        const blob = new Blob([bytes], {
            type: "application/json;charset=utf-8"
        });
        return blob;
    }

    public static downloadViaAhref(name: string, href: string) {
        const a = document.createElement("a");
        a.href = href;
        a.target = "_blank";
        a.download = name;
        a.click();

        // remove object url (if present)
        a.onclick = function() {
            requestAnimationFrame(function() {
                URL.revokeObjectURL(a.href);
            });
            a.removeAttribute("href");
        };
    }

    public static selectFile(handler: any) {
        const hiddenElement = document.createElement("input");
        hiddenElement.setAttribute("type", "file");
        hiddenElement.addEventListener("change", handler);
        hiddenElement.style.display = "none";
        document.documentElement.appendChild(hiddenElement);
        hiddenElement.click();
    }

    public static saveSelectedFileInLocalStorage(ev: any) {
        const files = ev.srcElement.files;
        if (files.length > 0) {
            FileHelper.saveInLocalStorage(files[0], LOCAL_STORAGE_DATASET);
        }
    }

    public static saveInLocalStorage(file: Blob, key: string) {
        if (file) {
            const reader = new FileReader();
            reader.readAsText(file, "UTF-8");
            reader.onload = function(evt: any) {
                if (evt && evt.target && evt.target.result) {
                    localStorage.setItem(key, evt.target.result);
                    alert("Succesfully read file into localStorage");
                }
            };
            reader.onerror = function(evt) {
                alert("Unable to read file");
            };
        }
    }
}
