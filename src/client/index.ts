import {
    makeRenderLoop,
    h
} from 'nimble';

function leftPad(number: any, targetLength: number) {
    const str = String(number);
    return '0'.repeat(Math.max(targetLength - str.length, 0)) + str;
}

const target = <HTMLElement>document.getElementById('frame');

const availableSteps = Array(96).join(',').split(',').map((_, index) => {
    return leftPad(index * 3, 3);
});

function makeImgUrl(model: string, runCode: string, stepId: string) {
    return `http://209.250.243.93:5000/${model}.${runCode}/gfs.t00z.pgrb2.1p00.f${stepId}.temp2.png`;
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
                    onclick: selectionHandler
                }, item.name);
            }))
        ])
}

function makeSetValue(affect: Affect, targetKp: string) {
    return function setValue({ value }: any) {
        affect.set(targetKp, value);
    }
}

makeRenderLoop(target, {
    selectedModel: 'gfs',
    selectedRun: '2018061800',
    selectedStep: availableSteps[0],
    availableSteps: availableSteps
},
    function (state, affect, changes) {
        const selectedStepIndex = state.availableSteps.indexOf(state.selectedStep);

        const favourites = [{
            name: 'GFS UK Pressure',
            value: 'GFSUKPRESSURE'
        }, {
            name: 'GFS UK Pressure',
            value: 'GFSUKPRESSURE'
        }, {
            name: 'GFS UK Pressure',
            value: 'GFSUKPRESSURE'
        }, {
            name: 'GFS UK Pressure',
            value: 'GFSUKPRESSURE'
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
                        makeItemSelector('Favourites', function () { }, favourites, { colour: '#9B51E0', compact: true }),
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
                                'background-image': `url(${makeImgUrl(state.selectedModel, state.selectedRun, state.selectedStep)})`
                            }
                        }),
                        h('div.img-preload', state.availableSteps
                            .slice(selectedStepIndex - 3, selectedStepIndex + 3)
                            .map(stepId => {
                                return h('img', { src: makeImgUrl(state.selectedModel, state.selectedRun, stepId) })
                            })),
                        h('div.timebar', {}, [
                            h('div.steps', state.availableSteps.map((stepId) => {
                                const isSelected = state.selectedStep === stepId;
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