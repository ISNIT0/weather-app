"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var nimble_1 = require("nimble");
function leftPad(number, targetLength) {
    var str = String(number);
    return '0'.repeat(Math.max(targetLength - str.length, 0)) + str;
}
var target = document.getElementById('frame');
var availableSteps = Array(96).join(',').split(',').map(function (_, index) {
    return leftPad(index * 3, 3);
});
function makeImgUrl(model, runCode, stepId) {
    return "http://209.250.243.93:5000/" + model + "." + runCode + "/gfs.t00z.pgrb2.1p00.f" + stepId + ".temp2.png";
}
function makeItemSelector(title, selectionHandler, items, opts) {
    if (opts === void 0) { opts = {}; }
    return nimble_1.h('div.item-selector', {
        style: {
            background: opts.colour || '#f2f2f2'
        }
    }, [
        nimble_1.h('div.header', [
            opts.helpText ? nimble_1.h('div.help', '?') : null,
            nimble_1.h('h3.title', title)
        ]),
        nimble_1.h("div." + (opts.compact ? 'items-compact' : 'items'), items.map(function (item) {
            return nimble_1.h('button.item', {
                onclick: function () { return selectionHandler(item); }
            }, item.name);
        }))
    ]);
}
function makeSetValue(affect, targetKp) {
    return function setValue(_a) {
        var value = _a.value;
        affect.set(targetKp, value);
    };
}
nimble_1.makeRenderLoop(target, {
    selectedModel: 'gfs',
    selectedRun: '2018061800',
    selectedStep: availableSteps[0],
    availableSteps: availableSteps
}, function (state, affect, changes) {
    var selectedStepIndex = state.availableSteps.indexOf(state.selectedStep);
    var favourites = [{
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
    var models = [
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
    var regions = [
        { name: 'United Kingdom', value: 'gbr' },
        { name: 'Germany', value: 'ger' },
        { name: 'France', value: 'fra' },
        { name: 'Spain', value: 'esp' },
        { name: 'United States', value: 'usa' }
    ];
    var parameters = [
        { name: 'Pressure', value: 'parameters' },
        { name: 'Temperature 2M', value: 'tmp2m' },
        { name: 'Wind 2M', value: 'wind2m' },
        { name: 'Effective Cloud', value: 'effCloud' }
    ];
    return nimble_1.h('div.app', [
        nimble_1.h('div.row', [
            nimble_1.h('div.column', {
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
            nimble_1.h('div.column', {
                style: {
                    width: '100%'
                }
            }, [
                nimble_1.h('div.img', {
                    style: {
                        'background-image': "url(" + makeImgUrl(state.selectedModel, state.selectedRun, state.selectedStep) + ")"
                    }
                }),
                nimble_1.h('div.img-preload', state.availableSteps
                    .slice(selectedStepIndex - 3, selectedStepIndex + 3)
                    .map(function (stepId) {
                    return nimble_1.h('img', { src: makeImgUrl(state.selectedModel, state.selectedRun, stepId) });
                })),
                nimble_1.h('div.timebar', {}, [
                    nimble_1.h('div.steps', state.availableSteps.map(function (stepId) {
                        var isSelected = state.selectedStep === stepId;
                        return nimble_1.h("button.step" + (isSelected ? '.selected' : ''), {
                            onclick: function () { return affect.set('selectedStep', stepId); }
                        }, [stepId]);
                    }))
                ])
            ])
        ])
    ]);
});
