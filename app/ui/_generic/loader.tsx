// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright © 2018-2022 Sander Stolk

import * as React from "react";
import { DictionaryLike } from "app/utils/syntax-helpers";
import { DataLoader } from "app/services/data-loader/data-loader.service";
import { ErrorMessage } from "./error-message";
import { Spinner } from "reactstrap";

import "./loader.less";

export type LoadingSymbol = "ellipsis" | "spinner";

export interface DataRequest {
    key: string;
    promiseFunc: (...args: any[]) => Promise<any> | null;
    promiseArgs: any[];
}

export function withLoadingMultiple(
    WrappedComponent: any,
    loadingSymbol: LoadingSymbol,
    dataPromises: DataRequest[],
    initialData?: any
) {
    interface ILoaderState {
        data?: any;
        error?: Error;
    }

    return class Loader extends React.Component<any, ILoaderState> {
        /*        Loader() {
            this.state = { data: undefined };
        }*/

        async componentDidMount() {
            await this.loadData();
        }

        /*        static getDerivedStateFromProps(props: any, state: ILoaderState) {
            // Store prevId in state so we can compare when props change.
            // Clear out previously-loaded data (so we don't render stale stuff).
//            if (props.id !== state.prevId) {
              return {
                data: undefined //,
//                prevId: props.id,
              };
//            }
//        
//            // No state update necessary
//            return null;
          }*/

        async componentDidUpdate(prevProps: any, prevState: ILoaderState) {
            if (!this.state || this.state.data === undefined) {
                DataLoader.unsubscribe(this);
                await this.loadData();
            }
        }

        componentWillUnmount() {
            DataLoader.unsubscribe(this);
        }

        async loadData() {
            try {
                let loadedData: any = initialData ? initialData : null;
                for (const { key, promiseFunc, promiseArgs } of dataPromises) {
                    if (promiseFunc) {
                        const promise = promiseFunc(...promiseArgs);
                        if (promise) {
                            const trashablePromise = DataLoader.subscribe(this, promise);
                            const promiseResult = await trashablePromise;
                            if (key && key.length > 0) {
                                if (!loadedData) {
                                    const emptyDictionary: DictionaryLike<string> = {};
                                    loadedData = emptyDictionary;
                                }
                                loadedData[key] = promiseResult;
                            } else {
                                loadedData = promiseResult;
                            }
                        }
                    }
                }
                //console.log("Managed to load the following data");
                //console.log(loadedData);
                this.setState({
                    data: loadedData
                });
            } catch (ex) {
                this.setState({
                    error: ex
                });
            }
        }

        render() {
            if (this.state && this.state.error) {
                return <ErrorMessage error={this.state.error} />;
            }
            if (!this.state || this.state.data === undefined) {
                return loadingSymbol == "ellipsis" ? (
                    <span style={{ width: "1em" }}>
                        <span className="oi oi-ellipsis ellipsis-loading">...</span>
                    </span>
                ) : (
                    <Spinner color="primary" />
                );
            }
            return <WrappedComponent data={this.state.data} {...this.props} />;
        }
    };
}

export function withLoading(
    WrappedComponent: any,
    loadingSymbol: LoadingSymbol,
    promiseFunc: (...args: any[]) => Promise<any> | null,
    promiseArgs: any[],
    initialData?: any
) {
    return withLoadingMultiple(
        WrappedComponent,
        loadingSymbol,
        [{ key: "", promiseFunc, promiseArgs }],
        initialData
    );
}
