// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright © 2018-2022 Sander Stolk

import * as React from "react";
import { RouteComponentProps } from "react-router";
import {
    Bar,
    BarChart,
    CartesianGrid,
    Legend,
    LegendType,
    Line,
    LineChart,
    ReferenceArea,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis
} from "recharts";
import {
    Button,
    Col,
    Container,
    CustomInput,
    DropdownMenu,
    DropdownItem,
    Form,
    FormGroup,
    Input,
    Label,
    DropdownToggle,
    Modal,
    ModalHeader,
    ModalBody,
    UncontrolledDropdown,
    UncontrolledTooltip,
    Row,
    Table
} from "reactstrap";
import { DataLoader } from "app/services/data-loader/data-loader.service";
import { DataRequest, withLoadingMultiple } from "app/ui/_generic/loader";
import {
    getFeatureSelector,
    Features,
    FeaturesSelector
} from "app/ui/components/features.selector";
import { getLDResourceItem } from "app/ui/elements/ld-resource-item";
import { getQueryParam } from "app/utils/syntax-helpers";
import { IAppConfigProvider } from "app/services/config/app-config-loader.service";
import { NavigateService } from "app/services/navigate.service";
import { resolveInject } from "app/di";
import { ScaleBar } from "app/ui/components/scalebar";
import { scaleOrdinal } from "d3-scale";
import { schemePaired } from "d3-scale-chromatic";
import { TopMenu } from "app/ui/sections/top-menu";

type ChartType = "count" | "conceptDistribution" | "ambiguity" | "treeDepth";

interface IStatisticsSelection {
    type: string;
    features?: any;
    compare?: string;
    compareFeatures?: any;
    location?: string;
    chart?: ChartType;
}

export interface IStatisticsPageState extends IStatisticsSelection {
    //    FeatureSelector: any;
    propsDirty: boolean;
}

export interface IStatisticsPageProps extends RouteComponentProps<RouteParams> {}

interface RouteParams {}

/*
 * Page component for statistics.
 */
export class StatisticsPage extends React.Component<IStatisticsPageProps, IStatisticsPageState> {
    public static PATHNAME = "/statistics";

    private appConfigProvider = resolveInject(IAppConfigProvider);
    private statisticsRef: any;
    private cachedFeatureData: any = { concept: {}, entry: {}, sense: {} };

    constructor(props: IStatisticsPageProps) {
        super(props);
        this.appConfigProvider.apply(props);
        this.onFeaturesChange = this.onFeaturesChange.bind(this);
        this.onCompareFeaturesChange = this.onCompareFeaturesChange.bind(this);

        this.state = this.getStateFromProps(props);
    }

    getStateFromProps(props: IStatisticsPageProps, forceRefresh = false) {
        const type = getQueryParam("type", props) == "entry" ? "entry" : "sense";

        //        const prevFeatureSelector = this.state && this.state.FeatureSelector;
        //        const prevType = this.state && this.state.type;

        //        const FeatureSelector = /*(prevFeatureSelector && !forceRefresh && type==prevType) ?
        //            prevFeatureSelector :*/ getFeatureSelector(type, this.cachedFeatureData[type]);
        const state = {
            type: type,
            //            FeatureSelector: FeatureSelector,
            features: this.getFeaturesFromProps("features", props),
            compare: getQueryParam("compare", props),
            compareFeatures: this.getFeaturesFromProps("compareFeatures", props),
            location: getQueryParam("location", props),
            chart: getQueryParam("chart", props) as ChartType | undefined,
            propsDirty: false
        };
        return state;
    }

    getFeaturesFromProps(paramName: string, props: IStatisticsPageProps) {
        try {
            const featuresParam = getQueryParam(paramName, props);
            return featuresParam && JSON.parse(featuresParam);
        } catch (e) {
            return null;
        }
    }

    componentWillReceiveProps(nextProps: IStatisticsPageProps) {
        const configChanged = this.appConfigProvider.apply(nextProps);
        this.setState(this.getStateFromProps(nextProps, configChanged));
    }

    /* Two example JSON snippets of features. 
   First entry in an array specifies the logic how to combine its elements
   (i.e., "and", "or", or "not"). If left unspecified, "and" is presumed.

[ "and",
    { "label": "http://../beo" },
    { "label": "http://../hapax" },
    { "language": "ang" }
]

[ "and",
    { "language": "ang" },
    [ "or",
        { "label": "http://../beo" },
        { "label": "http://../hapax" }
    ],
    [ "not", 
        { "pos": "http://../noun" }
    ]
]

*/

    render(): JSX.Element {
        const config = this.appConfigProvider.config;
        const dataPresent = config.datasetsEnabled.length > 0;
        return (
            <>
                <TopMenu />
                {dataPresent && (
                    <>
                        {this.renderInterface()}
                        {this.renderStatistics()}
                    </>
                )}
            </>
        );
    }

    renderInterface(): JSX.Element {
        const {
            type,
            /*FeatureSelector,*/ features,
            compare,
            compareFeatures,
            location,
            chart
        } = this.state;
        const FeatureSelector = getFeatureSelector(type, this.cachedFeatureData[type]);

        return (
            <Container fluid style={{ marginBottom: "4em" }}>
                <Form>
                    <Row
                        style={{
                            height: "10vh",
                            border: "#dedede 1px solid",
                            backgroundColor: "rgb(233, 236, 239)",
                            color: "#909090",
                            alignContent: "center"
                        }}
                    >
                        <Col>
                            Provide statistics on{" "}
                            <Input
                                type="select"
                                name="type"
                                id="selectType"
                                style={{ display: "inline", width: "auto" }}
                                value={type}
                                onChange={(event: any) => {
                                    const type = event.target.value;
                                    /*                    const FeatureSelector = getFeatureSelector(type, this.cachedFeatureData[type]);*/
                                    this.setState({
                                        type,
                                        /*FeatureSelector,*/ features: undefined,
                                        propsDirty: true
                                    });
                                }}
                            >
                                <option value="sense">lexical senses</option>
                                <option value="entry">lexical entries</option>
                            </Input>{" "}
                            with the following features:
                        </Col>
                    </Row>
                    <Row>
                        <Col xs="7">
                            <br />
                            <FeatureSelector
                                type={type}
                                features={features}
                                onChange={this.onFeaturesChange}
                            />
                            <br />
                        </Col>

                        {Array.isArray(features) &&
                            (Features.contains(features, "language") ||
                                Features.contains(features, "pos") ||
                                Features.contains(features, "label")) && (
                                <Col className="dotted-spaced left">
                                    <br />

                                    {compare != "features" && (
                                        <FormGroup>
                                            <Label for="exampleCheckbox">
                                                Care to compare with...
                                            </Label>
                                            <div>
                                                {Features.contains(features, "language") && (
                                                    <CustomInput
                                                        type="switch"
                                                        id="switchCompareLanguage"
                                                        name="compare"
                                                        value="language"
                                                        label="... those from other languages?"
                                                        checked={compare == "language"}
                                                        onChange={() => {
                                                            const newCompare =
                                                                compare != "language"
                                                                    ? "language"
                                                                    : undefined;
                                                            this.setState({
                                                                compare: newCompare,
                                                                propsDirty: true
                                                            });
                                                        }}
                                                    />
                                                )}
                                                {Features.contains(features, "pos") && (
                                                    <CustomInput
                                                        type="switch"
                                                        id="switchComparePos"
                                                        name="compare"
                                                        value="pos"
                                                        label="... those from other parts of speech?"
                                                        checked={compare == "pos"}
                                                        onChange={() => {
                                                            const newCompare =
                                                                compare != "pos"
                                                                    ? "pos"
                                                                    : undefined;
                                                            this.setState({
                                                                compare: newCompare,
                                                                propsDirty: true
                                                            });
                                                        }}
                                                    />
                                                )}
                                                <CustomInput
                                                    type="switch"
                                                    id="switchCompareFeatures"
                                                    name="compare"
                                                    value="features"
                                                    label="... those with another set of features?"
                                                    checked={compare == "features"}
                                                    onChange={() => {
                                                        const newCompare =
                                                            compare != "features"
                                                                ? "features"
                                                                : undefined;
                                                        this.setState({
                                                            compare: newCompare,
                                                            propsDirty: true
                                                        });
                                                    }}
                                                />
                                            </div>
                                        </FormGroup>
                                    )}
                                    {compare == "features" && (
                                        <div>
                                            Compare with the following features:
                                            <FeatureSelector
                                                type={type}
                                                features={compareFeatures}
                                                onChange={this.onCompareFeaturesChange}
                                            />
                                        </div>
                                    )}

                                    <br />
                                </Col>
                            )}
                    </Row>
                    <Row>
                        <Col>
                            <Button
                                color="primary"
                                size="lg"
                                className="btn-primary-white"
                                block
                                onClick={() => {
                                    NavigateService.statistics(
                                        type,
                                        features,
                                        compare,
                                        compare == "features" ? compareFeatures : undefined,
                                        location,
                                        chart
                                    );
                                    if (this.statisticsRef) {
                                        this.statisticsRef.scrollIntoView();
                                    }
                                }}
                            >
                                Generate statistics
                            </Button>
                        </Col>
                    </Row>
                </Form>
            </Container>
        );
    }

    onFeaturesChange(features: any): void {
        const compare = this.state.compare;
        const newCompare =
            !(
                Features.contains(features, "language") ||
                Features.contains(features, "pos") ||
                Features.contains(features, "label")
            ) ||
            (compare == "language" && !Features.contains(features, "language")) ||
            (compare == "pos" && !Features.contains(features, "pos"))
                ? undefined
                : compare;

        this.setState({ features, compare: newCompare, propsDirty: true });
    }

    onCompareFeaturesChange(compareFeatures: any): void {
        this.setState({ compareFeatures, propsDirty: true });
    }

    renderStatistics(): JSX.Element {
        const { propsDirty } = this.state;
        const props = this.getStateFromProps(this.props);
        const cachedData = this.cachedFeatureData[props.type];
        const requests = FeaturesSelector.getFeaturesRequests(props.type, cachedData);
        const Section = withLoadingMultiple(StatisticsSection, "spinner", requests, cachedData);
        return (
            <div
                style={{ height: props.location ? "100vh" : "95vh" }}
                ref={ref => {
                    this.statisticsRef = ref;
                }}
            >
                {props.type && props.features && !propsDirty && <Section {...props} />}
            </div>
        );
    }
}

export interface IStatisticsSectionProps extends IStatisticsSelection {
    data: any;
}

class StatisticsSection extends React.Component<IStatisticsSectionProps> {
    constructor(props: IStatisticsSectionProps) {
        super(props);
        this.renderCount = this.renderCount.bind(this);
        this.renderDegreeOfAmbiguity = this.renderDegreeOfAmbiguity.bind(this);
        this.renderDegreeOfSynonymy = this.renderDegreeOfSynonymy.bind(this);
        this.renderConceptDistribution = this.renderConceptDistribution.bind(this);
        this.renderTreeDepth = this.renderTreeDepth.bind(this);
        this.renderConceptualDepth = this.renderConceptualDepth.bind(this);
    }

    render() {
        const { type, features, compare, compareFeatures, location, chart } = this.props;
        const chartsProps: any = {
            count: {
                title: "item count",
                description: "This chart shows the number of items in the selection.",
                renderFunction: this.renderCount
            },
            ambiguity: {
                title: "degree of ambiguity",
                description:
                    "This chart shows the number of lexical entries based on their sense count, also known as the degree of polysemy. If the selection criteria were based on lexical senses, this chart plots the entries to which they are attributed.",
                renderFunction: this.renderDegreeOfAmbiguity
                /* reduced to single numbers: average, median, mode, range (see https://www.purplemath.com/modules/meanmode.htm)  */
            },
            synonymy: {
                title: "degree of synonymy",
                description:
                    "This chart shows the number of lexical senses based on their synonym count. If the selection criteria were based on lexical entries, this chart plots the senses attributed to them.",
                renderFunction: this.renderDegreeOfSynonymy
                /* reduced to single numbers: average, median, mode, range (see https://www.purplemath.com/modules/meanmode.htm)  */
            },
            conceptDistribution: {
                title: "distribution: categories",
                description:
                    "This chart shows the distribution of lexical senses over categories. If the selection criteria were based on lexical entries, this chart counts the senses attributed to these entries.",
                renderFunction: this.renderConceptDistribution
            },
            treeDepth: {
                title: "distribution: tree depth",
                description:
                    "This chart shows the distribution of lexical senses over the various levels of the taxonomy. If the selection criteria were based on lexical entries, this chart counts the senses attributed to these entries.",
                renderFunction: this.renderTreeDepth
                /* reduced to single numbers: average, median, mode, range (see https://www.purplemath.com/modules/meanmode.htm)  
   NOTE: not using standard deviation, because it's not a bell curve (although it may resemble one for TOE, coincidentally) 
   it'd also be good to indicate what the odds were for a particular selection/draw vs all items
   (e.g., 40 permutations out of 200 possible would yield the same resulting graph/chart...)   ===>   also for synonymy etc?
   of course, this would ignore the fact that only so many permutations were REALLY possible, e.g., because of an author being confined to an intended meaning 
   ... which the taxonomy may indicate, but it's not always only hyponymy that's indicated in the hierarchy and metaphorical use would also be possible for authors... */
            } /*,
            "conceptualDepth": {
                title: 'distribution: conceptual depth',
                description: 'This chart shows the distribution of lexical senses over the various conceptual levels of the taxonomy. If the selection criteria were based on lexical entries, this chart counts the senses attributed to these entries.',
                renderFunction: this.renderConceptualDepth
            }*/
        };
        const chartsSequence = Object.keys(chartsProps);

        const chartId = chart || "count";
        const chartProps = chartsProps[chartId];

        const chartSeqNo = chartsSequence.indexOf(chartId);
        const chartPrevId =
            chartsSequence[(chartSeqNo + chartsSequence.length - 1) % chartsSequence.length];
        const chartNextId = chartsSequence[(chartSeqNo + 1) % chartsSequence.length];
        const LocationItem = location ? getLDResourceItem({ iri: location }) : null;
        return (
            <Container fluid id="charts-container">
                <Row
                    style={{
                        height: "10vh",
                        border: "#dedede 1px solid",
                        backgroundColor: "rgb(233, 236, 239)",
                        color: "#909090"
                    }}
                >
                    <Col style={{ margin: "auto", textAlign: "left" }} xs="1">
                        <span
                            style={{ cursor: "pointer" }}
                            onClick={() => {
                                NavigateService.statistics(
                                    type,
                                    features,
                                    compare,
                                    compareFeatures,
                                    location,
                                    chartPrevId
                                );
                            }}
                        >
                            &lt;
                        </span>
                    </Col>
                    <Col style={{ margin: "auto", textAlign: "center" }} xs="8">
                        <UncontrolledDropdown style={{ display: "inline-block" }}>
                            <DropdownToggle outline size="sm" style={{ fontStyle: "italic" }}>
                                {chartProps.title}
                            </DropdownToggle>
                            <DropdownMenu>
                                <DropdownItem header key="header">
                                    charts
                                </DropdownItem>
                                {Object.keys(chartsProps).map((key: string) => {
                                    return (
                                        <DropdownItem
                                            key={key}
                                            active={key == chartId}
                                            onClick={() => {
                                                NavigateService.statistics(
                                                    type,
                                                    features,
                                                    compare,
                                                    compareFeatures,
                                                    location,
                                                    key
                                                );
                                            }}
                                        >
                                            {chartsProps[key].title}
                                        </DropdownItem>
                                    );
                                })}
                            </DropdownMenu>
                        </UncontrolledDropdown>
                        {chartProps.description && (
                            <>
                                {" "}
                                <span
                                    className="oi oi-info oi-info-tooltip"
                                    id="chart-tooltip"
                                    style={{ marginLeft: "0.5em" }}
                                />
                                <UncontrolledTooltip placement="bottom" target="chart-tooltip">
                                    {chartProps.description}
                                </UncontrolledTooltip>
                            </>
                        )}
                    </Col>
                    <Col style={{ margin: "auto", textAlign: "right" }} xs="1">
                        <span
                            style={{ cursor: "pointer" }}
                            onClick={() => {
                                NavigateService.statistics(
                                    type,
                                    features,
                                    compare,
                                    compareFeatures,
                                    location,
                                    chartNextId
                                );
                            }}
                        >
                            &gt;
                        </span>
                    </Col>
                </Row>

                {location && (
                    <Row
                        style={{
                            height: "5vh",
                            alignItems: "center",
                            backgroundColor: "#868e96",
                            color: "white"
                        }}
                    >
                        <Col style={{ margin: "auto", textAlign: "left" }} xs="1">
                            <span className="oi oi-crop" />
                        </Col>
                        <Col style={{ margin: "auto", textAlign: "center" }} xs="8">
                            {location ? (
                                <LocationItem />
                            ) : (
                                <em>showing results for entire taxonomy</em>
                            )}
                            {/* <Button className="oi oi-magnifying-glass" /> */}
                        </Col>
                        <Col style={{ margin: "auto", textAlign: "left" }} xs="1">
                            {location && (
                                <span
                                    className="oi oi-delete"
                                    style={{ cursor: "pointer" }}
                                    onClick={() => {
                                        NavigateService.statistics(
                                            type,
                                            features,
                                            compare,
                                            compareFeatures,
                                            undefined,
                                            chart
                                        );
                                    }}
                                />
                            )}
                        </Col>
                    </Row>
                )}

                <div
                    style={{
                        width: "90vw",
                        height: location ? "85vh" : "90vh",
                        margin: "auto",
                        textAlign: "center"
                    }}
                >
                    {chartProps.renderFunction()}
                </div>
            </Container>
        );
    }

    renderCount() {
        const { type, features, compare, compareFeatures, location } = this.props;
        const useBarchart = compare && ["language", "pos"].includes(compare);
        const Chart = withLoadingMultiple(
            useBarchart ? CustomBarChart : ScaleBar,
            "spinner",
            this.createDataPromises(
                DataLoader.loadItemStatisticsCount,
                type,
                features,
                type,
                compare,
                compareFeatures,
                location
            )
        );

        const correctDataScaleBar = (data: any) => {
            if (data) {
                if (Object.keys(data).includes("selection") && Object.keys(data).includes("all")) {
                    const selectionCount = data.selection ? data.selection[0].count : 0;
                    const allCount = data.all ? data.all[0].count : selectionCount;
                    return [
                        { name: "selection", value: selectionCount },
                        { name: "other", value: allCount - selectionCount }
                    ];
                }
                return Object.keys(data).map((key: string) => {
                    return { name: key, value: Array.isArray(data[key]) ? data[key][0].count : 0 };
                });
            }
            return [{ name: "selection", value: 0 }, { name: "other", value: 0 }];
        };
        const correctDataBarChart = (data: any) => {
            if (data) {
                const result: any = { selection: [] };
                for (const key of Object.keys(data)) {
                    result["selection"].push({
                        name: key,
                        value: Array.isArray(data[key]) ? data[key][0].count : 0
                    });
                }
                return result;
            }
            return null;
        };

        return useBarchart ? (
            <Chart
                dataKeyXaxis="name"
                dataKeyYaxis="value"
                labelXaxis={compare}
                labelYaxis="# of items"
                correctData={correctDataBarChart}
            />
        ) : (
            <Chart width={450} height={40} correctData={correctDataScaleBar} />
        );
    }

    renderDegreeOfAmbiguity() {
        const { type, features, compare, compareFeatures, location } = this.props;
        const Chart = withLoadingMultiple(
            CustomLineChart,
            "spinner",
            this.createDataPromises(
                DataLoader.loadItemStatisticsAmbiguity,
                type,
                features,
                "entry",
                compare,
                compareFeatures,
                location
            )
        );
        return (
            <Chart
                dataKeyXaxis="senseCount"
                dataKeyYaxis="count"
                labelXaxis="# of senses"
                labelYaxis="# of entries"
            />
        );
    }

    renderDegreeOfSynonymy() {
        const { type, features, compare, compareFeatures, location } = this.props;
        const Chart = withLoadingMultiple(
            CustomLineChart,
            "spinner",
            this.createDataPromises(
                DataLoader.loadItemStatisticsSynonymy,
                type,
                features,
                "sense",
                compare,
                compareFeatures,
                location
            )
        );
        return (
            <Chart
                dataKeyXaxis="synonymCount"
                dataKeyYaxis="count"
                labelXaxis="# of synonyms"
                labelYaxis="# of senses"
            />
        );
    }

    renderTreeDepth() {
        const { type, features, compare, compareFeatures, location } = this.props;
        const Chart = withLoadingMultiple(
            CustomLineChart,
            "spinner",
            this.createDataPromises(
                DataLoader.loadItemStatisticsTreeDepth,
                type,
                features,
                "sense",
                compare,
                compareFeatures,
                location
            )
        );
        return (
            <Chart
                dataKeyXaxis="depth"
                dataKeyYaxis="count"
                labelXaxis="taxonomy level"
                labelYaxis="# of senses"
            />
        );
    }

    renderConceptualDepth() {
        const { type, features, compare, compareFeatures, location } = this.props;
        const Chart = withLoadingMultiple(
            CustomLineChart,
            "spinner",
            this.createDataPromises(
                DataLoader.loadItemStatisticsConceptualDepth,
                type,
                features,
                "sense",
                compare,
                compareFeatures,
                location
            )
        );
        return (
            <Chart
                dataKeyXaxis="depth"
                dataKeyYaxis="count"
                labelXaxis="conceptual level"
                labelYaxis="# of senses"
            />
        );
    }

    renderConceptDistribution() {
        const { type, features, compare, compareFeatures, location, chart } = this.props;
        const Chart = withLoadingMultiple(
            CustomBarChart,
            "spinner",
            this.createDataPromises(
                DataLoader.loadItemStatisticsConceptDistribution,
                type,
                features,
                "sense",
                compare,
                compareFeatures,
                location
            )
        );
        const handleClickConcept = (clickData: any, index: number | null, data: any) => {
            if (index !== null) {
                const point = data[index];
                if (point.iri) {
                    const location = point.iri;
                    NavigateService.statistics(
                        type,
                        features,
                        compare,
                        compareFeatures,
                        location,
                        chart
                    );
                }
            }
        };
        return (
            <Chart
                dataKeyXaxis="label"
                dataKeyYaxis="value"
                labelXaxis="concept"
                labelYaxis="# of senses"
                onClickXtick={handleClickConcept}
                onClickChart={handleClickConcept}
            />
        );
    }

    createDataPromises(
        promiseFunc: (...args: any[]) => Promise<any> | null,
        type: string,
        features: any,
        resultType: string,
        compare: string | undefined,
        compareFeatures: any,
        location: string | undefined
    ): DataRequest[] {
        let requests: DataRequest[] = [];
        switch (compare) {
            case "pos":
                const allPos = this.props.data && this.props.data.pos;
                if (allPos && Array.isArray(allPos)) {
                    requests = allPos.map((pos: any) => {
                        return {
                            key: pos.name,
                            promiseFunc,
                            promiseArgs: [
                                type,
                                this.buildFeaturesWithPOS(features, pos.entry),
                                location
                            ]
                        };
                    });
                }
                break;

            case "language":
                const allLanguages = this.props.data && this.props.data.languages;
                if (allLanguages && Array.isArray(allLanguages)) {
                    requests = allLanguages.map((language: any) => {
                        return {
                            key: language.name,
                            promiseFunc,
                            promiseArgs: [
                                type,
                                this.buildFeaturesWithLanguage(features, language.entry),
                                location
                            ]
                        };
                    });
                }
                break;

            case "features":
                requests = [
                    { key: "selection", promiseFunc, promiseArgs: [type, features, location] },
                    {
                        key: "selection2",
                        promiseFunc,
                        promiseArgs: [type, compareFeatures ? compareFeatures : {}, location]
                    }
                ];
                break;

            default:
                break;
        }

        if (requests.length == 0) {
            requests = [
                { key: "selection", promiseFunc, promiseArgs: [type, features, location] },
                { key: "all", promiseFunc, promiseArgs: [type, {}, location] }
            ];
        }

        if (promiseFunc != DataLoader.loadItemStatisticsCount) {
            requests = requests.concat(
                requests.map(req => {
                    const args = [...req.promiseArgs];
                    args[2] = resultType; // delete 'location'; set 'resultType'
                    return {
                        key: "EVOKE-SPECIFIEDTOTAL-" + req.key,
                        promiseFunc: DataLoader.loadItemStatisticsTypeCount,
                        promiseArgs: args
                    };
                })
            );
        }

        return requests;
    }

    buildFeaturesWithLanguage(features: any, languageIRI: any) {
        return JSON.parse(JSON.stringify(features), (key, value) => {
            return key == "language" ? languageIRI : value;
        });
    }

    buildFeaturesWithPOS(features: any, posIRI: any) {
        return JSON.parse(JSON.stringify(features), (key, value) => {
            return key == "pos" ? posIRI : value;
        });
    }
}

type CustomChartShow = "chart" | "summary";
type CustomChartMode = "absolute" | "relative";
type CustomChartRelativeTo = "specifiedTotal" | "serieTotal";

interface CustomChartProps {
    data: any;
    correctData?: ((data: any) => any);
    dataKeyXaxis: string;
    dataKeyYaxis: string;
    labelXaxis?: string;
    labelYaxis?: string;
    onClickXtick?: ((clickData: any, index: number, data: any) => void);
    onClickChart?: ((clickData: any, index: number, data: any) => void);
    show?: CustomChartShow;
    mode?: CustomChartMode;
    relativeTo?: CustomChartRelativeTo;
}

interface DataSeriesSummary {
    averageY?: number;
    averageX?: number;
    median?: number;
    mode?: number;
    domain?: number[];
    range?: number[];
}

interface CustomChartState {
    data: any;
    dataSummaries: any;
    dataSeries: string[];
    dataSeriesDisabled: string[];
    show: CustomChartShow;
    mode: CustomChartMode;
    relativeTo?: CustomChartRelativeTo;
    left: any;
    right: any;
    refAreaLeft: any;
    refAreaRight: any;
    bottom: any;
    top: any;
    animation: boolean;
    showYAxisMenu?: boolean;
}

class CustomChart extends React.Component<CustomChartProps, CustomChartState> {
    colours = ["rgb(255, 127, 0)", "#26ace2"].concat(
        scaleOrdinal(schemePaired)
            .range()
            .slice(2)
    );

    constructor(props: CustomChartProps) {
        super(props);

        this.formatValue = this.formatValue.bind(this);
        this.getAxisYDomain = this.getAxisYDomain.bind(this);
        this.renderLegendText = this.renderLegendText.bind(this);
        this.getColour = this.getColour.bind(this);
        this.getLegendPayload = this.getLegendPayload.bind(this);
        this.handleLegendClick = this.handleLegendClick.bind(this);
        this.toggleSerie = this.toggleSerie.bind(this);
        this.toggleShow = this.toggleShow.bind(this);
        //        this.toggleMode = this.toggleMode.bind(this);
        this.handleXaxisClick = this.handleXaxisClick.bind(this);
        this.handleChartClick = this.handleChartClick.bind(this);
        this.toggleYAxisMenu = this.toggleYAxisMenu.bind(this);
        this.renderYAxisMenu = this.renderYAxisMenu.bind(this);

        const mode = props.mode ? props.mode : "relative";
        const relativeTo = props.relativeTo
            ? props.relativeTo
            : this.hasSpecifiedTotal()
                ? "specifiedTotal"
                : "serieTotal";
        const show = props.show ? props.show : "chart";
        const dataSeries = this.getDataSeries();
        const data = this.getStateData();
        const dataSummaries = this.getSummaries(dataSeries);

        this.state = {
            dataSeriesDisabled: [],
            dataSeries,
            data,
            dataSummaries,
            mode,
            show,
            relativeTo,
            left: "dataMin",
            right: "dataMax",
            refAreaLeft: "",
            refAreaRight: "",
            bottom: 0,
            top: mode == "relative" && relativeTo == "serieTotal" ? 100 : undefined,
            animation: true
        };
    }

    getDataSeries() {
        const { data, correctData } = this.props;
        const dataCorrected = correctData && data ? correctData(data) : data;
        return Object.keys(dataCorrected).filter(key => !key.startsWith("EVOKE-SPECIFIEDTOTAL-"));
    }

    hasSpecifiedTotal() {
        const { data, correctData } = this.props;
        const dataCorrected = correctData && data ? correctData(data) : data;
        return (
            Object.keys(dataCorrected).filter(key => key.startsWith("EVOKE-SPECIFIEDTOTAL-"))
                .length > 0
        );
    }

    getStateData() {
        const correctedData = this.getCorrectedData();
        const result = this.mergeDataSeries(correctedData);
        this.addRelativeCount(result);
        return result;
    }

    getCorrectedData() {
        const { data, correctData } = this.props;
        return correctData && data ? correctData(data) : data;
    }

    mergeDataSeries(data: any) {
        const { dataKeyXaxis, dataKeyYaxis } = this.props;
        const mergedData: any = [];
        // Assign to object, using keys
        for (const serie of this.getDataSeries()) {
            if (data[serie]) {
                data[serie].forEach((point: any) => {
                    const x = point[dataKeyXaxis];
                    const y = point[dataKeyYaxis];
                    let entry = mergedData[x];
                    if (!entry) {
                        entry = {};
                    }
                    Object.assign(entry, { [dataKeyXaxis]: x, [serie]: y });
                    for (const key in point) {
                        if (![dataKeyXaxis, dataKeyYaxis].includes(key)) {
                            Object.assign(entry, { [key]: point[key] });
                        }
                    }
                    mergedData[x] = entry;
                });
            }
        }
        // Assign to array, in alphabetical order
        const result = [];
        for (const key of Object.keys(mergedData)) {
            result.push(mergedData[key]);
        }
        return result;
    }

    addRelativeCount(data: any) {
        const dataSeries = this.getDataSeries();
        const { data: originalData, correctData, dataKeyYaxis } = this.props;
        const originalDataCorrected =
            correctData && originalData ? correctData(originalData) : originalData;
        for (const serie of dataSeries) {
            const total = !originalDataCorrected[serie]
                ? 0
                : originalDataCorrected[serie].reduce(
                      (result: number, point: any) => result + point[dataKeyYaxis],
                      0
                  );
            this.addRelativeCountForTotal(serie, data, total, "serieTotal");

            const specifiedTotalKey = "EVOKE-SPECIFIEDTOTAL-" + serie;
            if (specifiedTotalKey in originalDataCorrected) {
                this.addRelativeCountForTotal(
                    serie,
                    data,
                    originalDataCorrected[specifiedTotalKey][0].count,
                    "specifiedTotal"
                );
            }
        }
        return data;
    }

    addRelativeCountForTotal(serie: string, data: any, total: number, totalOf: string) {
        for (const point of data) {
            if (point[serie] !== undefined) {
                const value = point[serie] || 0;
                point[serie + "-RelativeTo-" + totalOf] = total == 0 ? 0 : value / total;
                point[serie + "-PercentageOf-" + totalOf] = total == 0 ? 0 : value * 100 / total;
            }
        }
    }

    getSummaries(dataSeries: string[]) {
        const result: any = {};
        if (!dataSeries) {
            return null;
        }

        for (const serie of dataSeries) {
            result[serie] = this.getSummary(serie);
        }
        return result;
    }

    getSummary(serie: string): DataSeriesSummary {
        const serieData = this.getCorrectedData()[serie];
        if (serieData && (serieData.length == 0 || this.isXaxisNumeric(serieData))) {
            const averageY = this.calculateAverage(serieData, false);
            const averageX = this.calculateAverage(serieData, true);
            const median = this.calculateMedian(serieData);
            const mode = this.calculateMode(serieData);
            const domain = this.calculateDomain(serieData);
            const range = this.calculateRange(serieData);
            return { averageY, averageX, median, mode, domain, range };
        }
        return {};
    }

    calculateAverage(serieData: any, ofXaxis = false) {
        const { dataKeyXaxis, dataKeyYaxis } = this.props;
        let totalValue = 0,
            totalMeasurements = 0;
        for (const point of serieData) {
            const category = point[dataKeyXaxis];
            const value = point[dataKeyYaxis];
            if (typeof category === "string" || Number.isNaN(category)) {
                if (ofXaxis) {
                    return NaN; // no such thing as an average of the X-axis in this case
                }
                totalValue += value;
            } else {
                totalValue += category * value;
            }
            totalMeasurements += ofXaxis ? value : 1;
        }
        return totalValue / totalMeasurements;
    }

    calculateMedian(serieData: any) {
        const { dataKeyXaxis, dataKeyYaxis } = this.props;
        let totalMeasurements = 0;
        for (const point of serieData) {
            const value = point[dataKeyYaxis];
            totalMeasurements += value;
        }
        if (!Number.isInteger(totalMeasurements)) {
            return undefined;
        }

        const midMeasurement1 = Math.floor((totalMeasurements + 1) / 2);
        const midMeasurement2 = Math.ceil((totalMeasurements + 1) / 2);

        totalMeasurements = 0;
        let result;
        for (const point of serieData) {
            const category = point[dataKeyXaxis];
            const value = point[dataKeyYaxis];
            totalMeasurements += value;
            if (totalMeasurements >= midMeasurement1) {
                if (result === undefined) {
                    result = category;
                }
            }
            if (totalMeasurements >= midMeasurement2) {
                result += category;
                return result / 2;
            }
        }
        return undefined;
    }

    calculateMode(serieData: any) {
        const { dataKeyXaxis, dataKeyYaxis } = this.props;
        let maxValue, maxValueXaxis;
        for (const point of serieData) {
            const value = point[dataKeyYaxis];
            if (maxValue === undefined || value > maxValue) {
                maxValue = value;
                maxValueXaxis = point[dataKeyXaxis];
            }
        }
        return maxValueXaxis;
    }

    calculateRange(serieData: any): number[] | undefined {
        const { dataKeyXaxis, dataKeyYaxis } = this.props;
        let minValue, maxValue;
        for (const point of serieData) {
            const value = point[dataKeyYaxis];
            if (maxValue === undefined || value > maxValue) {
                maxValue = value;
            }
            if (minValue === undefined || value < minValue) {
                minValue = value;
            }
        }
        return maxValue === undefined ? undefined : [minValue, maxValue];
    }

    calculateDomain(serieData: any): number[] | undefined {
        const { dataKeyXaxis } = this.props;
        return [serieData[0][dataKeyXaxis], serieData[serieData.length - 1][dataKeyXaxis]];
    }

    isXaxisNumeric(serieData: any) {
        const { dataKeyXaxis } = this.props;
        for (const point of serieData) {
            if (Number.isNaN(point[dataKeyXaxis])) {
                return false;
            }
        }
        return true;
    }

    getCurrentSerieModifier(forMode?: CustomChartMode, percentage = true): string {
        const { mode, relativeTo } = this.state;
        if ((forMode && forMode == "relative") || (!forMode && mode == "relative")) {
            return (
                (percentage ? "-PercentageOf-" : "-RelativeTo-") +
                (relativeTo || (this.hasSpecifiedTotal() ? "specifiedTotal" : "serieTotal"))
            );
        }
        return "";
    }

    getAxisYDomain(from?: number, to?: number, offset = 0, allowDecimals = true) {
        const { data, mode, dataSeries, dataSeriesDisabled, relativeTo } = this.state;
        const { dataKeyXaxis } = this.props;
        let top, bottom: number | undefined;

        for (const point of data) {
            if (
                (from === undefined || point[dataKeyXaxis] >= from) &&
                (to === undefined || point[dataKeyXaxis] <= to)
            ) {
                for (const serie of dataSeries) {
                    if (!dataSeriesDisabled.includes(serie)) {
                        const modifier = this.getCurrentSerieModifier();
                        const value = point[serie + modifier];
                        if (top === undefined || value > top) {
                            top = value;
                        }
                        if (bottom === undefined || value < bottom) {
                            bottom = value;
                        }
                    }
                }
            }
        }
        switch (mode) {
            case "absolute":
                return [0, top === undefined ? 5 : (allowDecimals ? top : Math.ceil(top)) + offset];
            case "relative":
                return [
                    0,
                    Math.min(
                        100,
                        top === undefined && relativeTo == "serieTotal"
                            ? 100
                            : (allowDecimals ? top : Math.ceil(top)) + offset
                    )
                ];
        }
    }

    renderLegendText(serie: string, entry: any) {
        const { dataSeries } = this.state;
        const index = dataSeries.indexOf(serie);
        const color = this.getColour(index);
        return <span style={{ color }}>{serie}</span>;
    }

    renderSummaries() {
        const { dataSeries, dataSummaries } = this.state;
        const summaryKeys = ["averageY", "averageX", "median", "mode", "domain", "range"];

        return (
            <Table hover size="sm">
                <thead>
                    <tr>
                        <th style={{ textAlign: "left" }}>series</th>
                        {summaryKeys.map(key => {
                            return <th key={key}>{key}</th>;
                        })}
                    </tr>
                </thead>
                <tbody>
                    {dataSeries.map((series, index) => {
                        return (
                            <tr key={series}>
                                <th
                                    scope="row"
                                    style={{
                                        textAlign: "left",
                                        fontWeight: "normal",
                                        color: this.getColour(index)
                                    }}
                                >
                                    {series}
                                </th>
                                {summaryKeys.map(key => {
                                    const value = dataSummaries[series][key];
                                    return (
                                        <td key={key}>
                                            {!Array.isArray(value)
                                                ? this.formatSummaryValue(value)
                                                : this.formatSummaryValue(value[0]) +
                                                  "-" +
                                                  this.formatSummaryValue(value[1])}
                                        </td>
                                    );
                                })}
                            </tr>
                        );
                    })}
                </tbody>
            </Table>
        );
    }

    formatSummaryValue(value: any): string {
        if (typeof value === "number") {
            if (Number.isNaN(value)) {
                return "-";
            }
            return value.toString();
        }
        return value;
    }

    handleLegendClick(event: any) {
        if (event && event.value) {
            this.toggleSerie(event.value);
        }
    }

    toggleSerie(serie: string) {
        const { mode, dataSeriesDisabled, relativeTo } = this.state;
        const disabledIndex = dataSeriesDisabled.indexOf(serie);
        if (disabledIndex < 0) {
            dataSeriesDisabled.push(serie);
        } else {
            dataSeriesDisabled.splice(disabledIndex, 1);
        }
        this.setState({
            dataSeriesDisabled,
            top: mode == "relative" && relativeTo == "serieTotal" ? 100 : undefined
        });
    }

    /*    toggleMode() {
        const newMode = (this.state.mode == 'absolute' ? 'relative' : 'absolute');
        this.setState({
            left: 'dataMin',
            right: 'dataMax',
            mode: newMode,
            refAreaLeft: '',
            refAreaRight: '',
            bottom: 0,
            top: (newMode=='relative' ? 100 : undefined),
            animation: true
        });
    }*/

    addPercentSign(percentage: number, precision = 0): string {
        return percentage.toFixed(precision) + "%";
    }

    formatValue(value: number, serie: string, props: any): string {
        const { dataSeriesDisabled } = this.state;
        if (dataSeriesDisabled.includes(serie)) {
            return "disabled";
        }
        const payload = props.payload;
        const total = Math.round(
            payload[serie] / payload[serie + this.getCurrentSerieModifier("relative", false)]
        );
        const percentage = payload[serie + this.getCurrentSerieModifier("relative", true)];
        const count = payload[serie];
        return (
            (count ? count : 0) +
            (Number.isNaN(total) || total == 0 ? "" : "/" + total) +
            " = " +
            this.addPercentSign(percentage, 2)
        );
    }

    getLegendPayload(type?: LegendType) {
        const { dataSeries } = this.state;
        return dataSeries.map((value, index) => {
            return {
                value: value,
                id: value,
                type: type !== undefined ? type : "line",
                color: this.getColour(index)
            };
        });
    }

    getColour(index: number): string | undefined {
        const { dataSeries, dataSeriesDisabled } = this.state;
        return dataSeriesDisabled.includes(dataSeries[index])
            ? "#e4e5e5"
            : this.colours[index % this.colours.length];
    }

    handleXaxisClick(clickData: any) {
        const { onClickXtick } = this.props;
        if (onClickXtick) {
            onClickXtick(clickData, clickData ? clickData.index : null, this.state.data);
        }
    }

    handleChartClick(clickData: any) {
        const { onClickChart } = this.props;
        if (onClickChart) {
            onClickChart(
                clickData,
                clickData ? clickData.activeTooltipIndex : null,
                this.state.data
            );
        }
    }

    toggleShow() {
        const { show } = this.state;
        this.setState({ show: show == "chart" ? "summary" : "chart" });
    }

    toggleYAxisMenu() {
        const { showYAxisMenu } = this.state;
        this.setState({ showYAxisMenu: !showYAxisMenu });
    }

    renderYAxisMenu() {
        const { showYAxisMenu, mode, relativeTo } = this.state;

        return (
            <Modal isOpen={showYAxisMenu} toggle={this.toggleYAxisMenu}>
                <ModalHeader toggle={this.toggleYAxisMenu}>Y axis</ModalHeader>
                <ModalBody>
                    <p>
                        The Y axis for this chart can be set to display its values as absolute
                        numbers or as percentages of the item count. Show the values on the Y axis
                        as:
                    </p>
                    <Input
                        type="select"
                        defaultValue={mode == "absolute" ? mode : relativeTo}
                        onChange={evt => {
                            const value = evt.target.value;
                            //            const { refAreaLeft, refAreaRight } = this.state;
                            //            const [bottom, top] = this.getAxisYDomain(refAreaLeft, refAreaRight, 2, false); // FIXME
                            this.setState({
                                mode: value == "absolute" ? value : "relative",
                                relativeTo:
                                    value == "absolute"
                                        ? undefined
                                        : (value as CustomChartRelativeTo),
                                bottom: undefined,
                                top: undefined
                            });
                            this.getAxisYDomain();
                            this.toggleYAxisMenu();
                        }}
                    >
                        <option value={"absolute"}>absolute numbers</option>
                        {this.hasSpecifiedTotal() && (
                            <option value={"specifiedTotal"}>percentages</option>
                        )}
                        <option value={"serieTotal"}>
                            percentages for the taxonomy branch chosen
                        </option>
                    </Input>
                </ModalBody>
            </Modal>
        );
    }
}

class CustomLineChart extends CustomChart {
    constructor(props: CustomChartProps) {
        super(props);
        this.zoomOut = this.zoomOut.bind(this);
        this.zoom = this.zoom.bind(this);
    }

    zoom() {
        let { refAreaLeft, refAreaRight } = this.state;
        const { data } = this.state;

        if (refAreaLeft === refAreaRight || refAreaRight === "") {
            this.setState({
                refAreaLeft: "",
                refAreaRight: ""
            });
            return;
        }

        // xAxis domain
        if (refAreaLeft > refAreaRight) {
            [refAreaLeft, refAreaRight] = [refAreaRight, refAreaLeft];
        }

        // yAxis domain
        const [bottom, top] = this.getAxisYDomain(refAreaLeft, refAreaRight, 2, false);

        this.setState({
            refAreaLeft: "",
            refAreaRight: "",
            data: data,
            left: refAreaLeft,
            right: refAreaRight,
            bottom,
            top
        });
    }

    zoomOut() {
        const { data, mode, relativeTo } = this.state;
        this.setState({
            data: data,
            refAreaLeft: "",
            refAreaRight: "",
            left: "dataMin",
            right: "dataMax",
            bottom: 0,
            top: mode == "relative" && relativeTo == "serieTotal" ? 100 : undefined
        });
    }

    render() {
        const { dataKeyXaxis, labelXaxis, labelYaxis } = this.props;
        const {
            data,
            left,
            right,
            refAreaLeft,
            refAreaRight,
            top,
            bottom,
            show,
            mode,
            dataSeries,
            dataSeriesDisabled
        } = this.state;

        return (
            <>
                <Row style={{ height: "5vh", alignContent: "center" }}>
                    <Button
                        outline
                        size="sm"
                        onClick={this.toggleShow}
                        style={{
                            height: "3vh",
                            marginLeft: "auto",
                            marginRight: "3.5vh",
                            paddingTop: "2px",
                            paddingBottom: "2px"
                        }}
                    >
                        {show == "chart" ? "show summary" : "show chart"}
                    </Button>
                </Row>

                {show == "chart" && (
                    <>
                        {(left != "dataMin" || right != "dataMax") && (
                            <a
                                href="javascript: void(0);"
                                className="btn update"
                                onClick={this.zoomOut.bind(this)}
                                style={{ position: "absolute", right: "10vw", zIndex: 100 }}
                            >
                                Zoom Out
                            </a>
                        )}
                        <Row style={{ height: "80vh" }}>
                            <ResponsiveContainer>
                                <LineChart
                                    data={data}
                                    width={500}
                                    height={300}
                                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                                    onMouseDown={e =>
                                        e &&
                                        e.activeLabel &&
                                        this.setState({ refAreaLeft: e.activeLabel })
                                    }
                                    onMouseMove={e =>
                                        e &&
                                        e.activeLabel &&
                                        this.state.refAreaLeft &&
                                        this.setState({ refAreaRight: e.activeLabel })
                                    }
                                    onMouseUp={this.zoom.bind(this)}
                                    onClick={this.handleChartClick}
                                >
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis
                                        onClick={this.handleXaxisClick}
                                        label={{
                                            value: labelXaxis,
                                            position: "insideBottomRight",
                                            offset: -5,
                                            className: "recharts-label-xaxis"
                                        }}
                                        type="number"
                                        dataKey={dataKeyXaxis}
                                        allowDataOverflow={true}
                                        domain={[left, right]}
                                        allowDecimals={false}
                                    />
                                    <YAxis
                                        /*onClick={() => this.toggleMode()}*/ onClick={() =>
                                            this.setState({ showYAxisMenu: true })
                                        }
                                        label={{
                                            value: labelYaxis,
                                            position: "insideTopLeft",
                                            angle: -90,
                                            className: "recharts-label-yaxis"
                                        }}
                                        allowDataOverflow={true}
                                        domain={[bottom, top]}
                                        allowDecimals={false}
                                        tickFormatter={
                                            mode == "relative" ? this.addPercentSign : undefined
                                        }
                                    />
                                    <Tooltip formatter={this.formatValue} />
                                    <Legend
                                        onClick={this.handleLegendClick}
                                        formatter={this.renderLegendText}
                                        payload={this.getLegendPayload()}
                                    />
                                    {dataSeries
                                        .filter(serie => {
                                            return !dataSeriesDisabled.includes(serie);
                                        })
                                        .map((serie, index) => {
                                            return (
                                                <Line
                                                    type="monotone"
                                                    key={serie}
                                                    name={serie}
                                                    dataKey={serie + this.getCurrentSerieModifier()}
                                                    stroke={this.getColour(
                                                        dataSeries.indexOf(serie)
                                                    )}
                                                    activeDot={{ r: 8 }}
                                                />
                                            );
                                        })}
                                    {refAreaLeft &&
                                        refAreaRight && (
                                            <ReferenceArea
                                                x1={refAreaLeft}
                                                x2={refAreaRight}
                                                strokeOpacity={0.3}
                                            />
                                        )}
                                </LineChart>
                            </ResponsiveContainer>
                            {this.renderYAxisMenu()}
                        </Row>
                    </>
                )}

                {show == "summary" && this.renderSummaries()}
            </>
        );
    }
}

class CustomBarChart extends CustomChart {
    render() {
        const { dataKeyXaxis, labelXaxis, labelYaxis } = this.props;
        const { data, dataSeries, dataSeriesDisabled, show, mode } = this.state;

        return (
            <>
                <Row style={{ height: "5vh", alignContent: "center" }}>
                    <Button
                        outline
                        size="sm"
                        onClick={this.toggleShow}
                        style={{
                            height: "3vh",
                            marginLeft: "auto",
                            marginRight: "3.5vh",
                            paddingTop: "2px",
                            paddingBottom: "2px"
                        }}
                    >
                        {show == "chart" ? "show summary" : "show chart"}
                    </Button>
                </Row>

                {show == "chart" && (
                    <Row style={{ height: "80vh" }}>
                        <ResponsiveContainer>
                            <BarChart
                                width={500}
                                height={300}
                                data={data}
                                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                                onClick={this.handleChartClick}
                            >
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis
                                    onClick={this.handleXaxisClick}
                                    label={{
                                        value: labelXaxis,
                                        position: "insideBottomRight",
                                        offset: -5,
                                        className: "recharts-label-xaxis"
                                    }}
                                    dataKey={dataKeyXaxis}
                                    allowDataOverflow={true}
                                    tick={<CustomizedCategoryTick />}
                                    interval={0}
                                    height={110}
                                />
                                <YAxis
                                    /*onClick={() => this.toggleMode()}*/ onClick={() =>
                                        this.setState({ showYAxisMenu: true })
                                    }
                                    label={{
                                        value: labelYaxis,
                                        position: "insideTopLeft",
                                        angle: -90,
                                        className: "recharts-label-yaxis"
                                    }}
                                    allowDataOverflow={true}
                                    allowDecimals={false}
                                    tickFormatter={
                                        mode == "relative" ? this.addPercentSign : undefined
                                    }
                                />
                                <Tooltip formatter={this.formatValue} />
                                <Legend
                                    onClick={this.handleLegendClick}
                                    formatter={this.renderLegendText}
                                    payload={this.getLegendPayload("square")}
                                />
                                {dataSeries
                                    .filter(serie => {
                                        return !dataSeriesDisabled.includes(serie);
                                    })
                                    .map((serie, index) => {
                                        return (
                                            <Bar
                                                key={serie}
                                                name={serie}
                                                dataKey={serie + this.getCurrentSerieModifier()}
                                                stroke="lightgrey"
                                                fill={this.getColour(dataSeries.indexOf(serie))}
                                            />
                                        );
                                    })}
                            </BarChart>
                        </ResponsiveContainer>
                        {this.renderYAxisMenu()}
                    </Row>
                )}

                {show == "summary" && this.renderSummaries()}
            </>
        );
    }
}

class CustomizedCategoryTick extends React.PureComponent<{
    x?: number;
    y?: number;
    stroke?: any;
    payload?: any;
}> {
    render() {
        const { x, y, stroke, payload } = this.props;
        return (
            <g transform={`translate(${x},${y})`}>
                <text
                    x={0}
                    y={-5}
                    dy={16}
                    textAnchor="end"
                    fill="#666"
                    transform="rotate(-35)"
                    style={{ fontSize: "x-small" }}
                >
                    {payload.value}
                </text>
            </g>
        );
    }
}
