import * as $ from 'jquery';
import * as moment from 'moment';

import {
    makeRenderLoop,
    h,
    get
} from 'nimble';

function leftPad(number: any, targetLength: number) {
    const str = String(number);
    return '0'.repeat(Math.max(targetLength - str.length, 0)) + str;
}

const target = <HTMLElement>document.getElementById('frame');

function makeImgUrl(imageHash: string) {
    return `http://209.250.243.93:5000/${imageHash}.png`;
}

type SelectionItem = {
    name: string,
    value: any
}
type ItemSelectorOpts = {
    colour?: string,
    helpText?: string,
    compact?: boolean
}

function makeItemSelector(title: string, selectionHandler: (item: SelectionItem) => void, items: SelectionItem[], opts: ItemSelectorOpts = {}) {
    return h('div.item-selector', {
        style: {
            background: opts.colour || '#f2f2f2'
        }
    }, [
            h('div.header', [
                opts.helpText ? h('div.help', '?') : null,
                h('h3.title', title)
            ]),
            h(`div.${opts.compact ? 'items-compact' : 'items'}`, items.map(item => {
                return h('button.item', {
                    onclick: () => selectionHandler(item)
                }, item.name);
            }))
        ])
}

function makeSetValue(affect: Affect, targetKp: string) {
    return function setValue({ value }: any) {
        affect.set(targetKp, value);
    }
}

type Step = {
    step: string,
    run: string,
    hash: string,
};

type Runs = {
    [runId: string]: Step[]
}

const affect = makeRenderLoop(target, {
    selectedModel: 'gfs',
    selectedRun: '',
    selectedStep: <Step>{},
    availableRuns: <Runs>{}
},
    function (state, affect, changes) {
        const steps = <Step[]>(get<Step[]>(state, `availableRuns.${state.selectedRun}`) || []);
        const selectedStepIndex = steps.findIndex((step: any) => step.step === state.selectedStep.step);

        const favourites = [{
            name: 'GFS UK Pressure',
            value: {
                model: 'gfs',
                region: 'gbr',
                parameter: 'pressure'
            }
        }, {
            name: 'GFS UK Pressure',
            value: {
                model: 'gfs',
                region: 'gbr',
                parameter: 'pressure'
            }
        }, {
            name: 'GFS UK Pressure',
            value: {
                model: 'gfs',
                region: 'gbr',
                parameter: 'pressure'
            }
        }, {
            name: 'GFS UK Pressure',
            value: {
                model: 'gfs',
                region: 'gbr',
                parameter: 'pressure'
            }
        }];

        const models = [
            {
                name: 'GFS Op',
                value: 'gfs'
            },
            {
                name: 'GFS Ens',
                value: 'gfsEns'
            },
            {
                name: 'EC Op',
                value: 'ecOp'
            },
            {
                name: 'EC Ens',
                value: 'ecEns'
            }
        ];

        const regions = [
            { name: 'United Kingdom', value: 'gbr' },
            { name: 'Germany', value: 'ger' },
            { name: 'France', value: 'fra' },
            { name: 'Spain', value: 'esp' },
            { name: 'United States', value: 'usa' }
        ];

        const parameters = [
            { name: 'Pressure', value: 'parameters' },
            { name: 'Temperature 2M', value: 'tmp2m' },
            { name: 'Wind 2M', value: 'wind2m' },
            { name: 'Effective Cloud', value: 'effCloud' }
        ];

        return h('div.app', [
            h('div.row', [
                h('div.column', {
                    style: {
                        width: '20%',
                        'max-width': '350px',
                        height: '100%',
                        'flex-shrink': 0,
                        background: '#f2f2f2'
                    }
                }, [
                        makeItemSelector('Favourites', function ({ value }: any) {
                            const { model, region, parameter } = value;
                            affect.set('selectedModel', model);
                            affect.set('selectedRegion', region);
                            affect.set('selectedParameter', parameter);
                        }, favourites, { colour: '#9B51E0', compact: true }),
                        makeItemSelector('Models', makeSetValue(affect, 'selectedModel'), models, { colour: '#F2C94C' }),
                        makeItemSelector('Regions', makeSetValue(affect, 'selectedRegion'), regions, { colour: '#F2994A' }),
                        makeItemSelector('Parameters', makeSetValue(affect, 'selectedParameter'), parameters, { colour: '#27AE60' }),
                    ]),
                h('div.column', {
                    style: {
                        width: '100%'
                    }
                }, [
                        h('div.img', {
                            style: {
                                'background-image': `url(${makeImgUrl(state.selectedStep.hash)})`
                            }
                        }),
                        h('div.img-preload', steps
                            .slice(selectedStepIndex - 3, selectedStepIndex + 3)
                            .map(step => {
                                return h('img', { src: makeImgUrl(state.selectedStep.hash) })
                            })),
                        h('div.timebar', {}, [
                            h('select.run-selector', {
                                onchange: function (ev: any) {
                                    const newRunCode = ev.target.value;
                                    affect.set('selectedRun', newRunCode);
                                    affect.set('availableSteps', state.availableRuns[newRunCode].map((a: any) => a.step));
                                }
                            }, Object.keys(state.availableRuns)
                                .map(runCode => {
                                    const date = moment(runCode, 'YYYYMMDDHH');
                                    return h('option', {
                                        selected: runCode === String(state.selectedRun),
                                        value: runCode
                                    }, date.format('YYYY-MM-DD HH[z]'));
                                })),
                            h('div.steps', steps.map((step) => {
                                const stepId = step.step;
                                const isSelected = state.selectedStep.step === stepId;
                                return h(`button.step${isSelected ? '.selected' : ''}`, {
                                    onclick: () => affect.set('selectedStep', stepId)
                                }, [stepId]);
                            }))
                        ])
                    ])
            ])
        ]);
    }
);

$.getJSON(`/api/mapRuns`)
    .then((data: any) => {
        affect.set('availableRuns', data);
        const latestRun = Object.keys(data)
            .map(a => parseInt(a))
            .sort((a, b) => a < b ? 1 : -1)[0];
        affect.set('selectedRun', latestRun);
        affect.set('selectedStep', data[latestRun][0].step);
    });