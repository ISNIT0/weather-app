"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var $ = require("jquery");
var moment = require("moment");
var nimble_1 = require("nimble");
function leftPad(number, targetLength) {
    var str = String(number);
    return '0'.repeat(Math.max(targetLength - str.length, 0)) + str;
}
var target = document.getElementById('frame');
function makeImgUrl(imageHash) {
    return "http://209.250.243.93:5000/" + imageHash + ".png";
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
var affect = nimble_1.makeRenderLoop(target, {
    selectedModel: 'gfs',
    selectedRun: '',
    selectedStep: {},
    availableRuns: {}
}, function (state, affect, changes) {
    var steps = (nimble_1.get(state, "availableRuns." + state.selectedRun) || []);
    var selectedStepIndex = steps.findIndex(function (step) { return step.step === state.selectedStep.step; });
    var favourites = [{
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
                makeItemSelector('Favourites', function (_a) {
                    var value = _a.value;
                    var model = value.model, region = value.region, parameter = value.parameter;
                    affect.set('selectedModel', model);
                    affect.set('selectedRegion', region);
                    affect.set('selectedParameter', parameter);
                }, favourites, { colour: '#9B51E0', compact: true }),
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
                        'background-image': "url(" + makeImgUrl(state.selectedStep.hash) + ")"
                    }
                }),
                nimble_1.h('div.img-preload', steps
                    .slice(selectedStepIndex - 3, selectedStepIndex + 3)
                    .map(function (step) {
                    return nimble_1.h('img', { src: makeImgUrl(step.hash) });
                })),
                nimble_1.h('div.timebar', {}, [
                    nimble_1.h('select.run-selector', {
                        onchange: function (ev) {
                            var newRunCode = ev.target.value;
                            affect.set('selectedRun', newRunCode);
                            affect.set('availableSteps', state.availableRuns[newRunCode].map(function (a) { return a.step; }));
                        }
                    }, Object.keys(state.availableRuns)
                        .map(function (runCode) {
                        var date = moment(runCode, 'YYYYMMDDHH');
                        return nimble_1.h('option', {
                            selected: runCode === String(state.selectedRun),
                            value: runCode
                        }, date.format('YYYY-MM-DD HH[z]'));
                    })),
                    nimble_1.h('div.steps', steps.map(function (step) {
                        var stepId = step.step;
                        var isSelected = state.selectedStep.step === stepId;
                        return nimble_1.h("button.step" + (isSelected ? '.selected' : ''), {
                            onclick: function () { return affect.set('selectedStep', step); }
                        }, [stepId]);
                    }))
                ])
            ])
        ])
    ]);
});
$.getJSON("/api/mapRuns")
    .then(function (data) {
    affect.set('availableRuns', data);
    var latestRun = Object.keys(data)
        .map(function (a) { return parseInt(a); })
        .sort(function (a, b) { return a < b ? 1 : -1; })[0];
    affect.set('selectedRun', latestRun);
    affect.set('selectedStep', data[latestRun][0]);
});
