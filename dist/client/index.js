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
function makeImgUrl(model, run, step, parameter, region) {
    return "/api/" + model + "/" + parameter + "/" + run + "/" + leftPad(step, 3) + "/" + region + ".png";
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
var isInitLoad = true;
var affect = nimble_1.makeRenderLoop(target, {
    selectedModel: 'gfs',
    selectedRun: '',
    selectedStep: {},
    availableRuns: {},
    selectedParameter: 'TMP_2maboveground',
    selectedRegion: 'gbr'
}, function (state, affect, changes) {
    var steps = (nimble_1.get(state, "availableRuns." + state.selectedRun) || []);
    var selectedStepIndex = steps.findIndex(function (step) { return step.step === state.selectedStep.step; });
    var mapChanged = changes.some(function (ch) { return ch.includes('selectedParameter') || ch.includes('selectedModel'); }) || isInitLoad;
    if (mapChanged) {
        $.getJSON("/api/mapRuns/" + state.selectedModel + "/" + state.selectedParameter)
            .then(function (data) {
            affect.set('availableRuns', data);
            var latestRun = Object.keys(data)
                .map(function (a) { return parseInt(a); })
                .sort(function (a, b) { return a < b ? 1 : -1; })[0];
            if (!state.selectedStep) {
                affect.set('selectedStep', data[latestRun][0]);
            }
            if (!state.selectedRun) {
                affect.set('selectedRun', latestRun);
            }
        });
    }
    if (isInitLoad) {
        isInitLoad = false;
    }
    var favourites = [{
            name: 'GFS UK Pressure',
            value: {
                model: 'gfs',
                region: 'gbr',
                parameter: 'pressure'
            }
        }, {
            name: 'GFS UK Temperature',
            value: {
                model: 'gfs',
                region: 'gbr',
                parameter: 'TMP_2maboveground'
            }
        }, {
            name: 'GFS UK Precipitation',
            value: {
                model: 'gfs',
                region: 'gbr',
                parameter: 'APCP_surface'
            }
        }, {
            name: 'GFS UK Low Cloud',
            value: {
                model: 'gfs',
                region: 'gbr',
                parameter: 'TCDC_lowcloudlayer'
            }
        }];
    var models = [
        {
            name: 'GFS Op',
            value: 'gfs'
        },
    ];
    var regions = [
        { name: 'United Kingdom', value: 'gbr' },
        { name: 'Germany', value: 'ger' },
        { name: 'France', value: 'fra' },
        { name: 'Spain', value: 'esp' },
        { name: 'United States', value: 'usa' }
    ];
    var parameters = [
        { name: 'Pressure', value: 'PRES_surface' },
        { name: 'Temperature 2M', value: 'TMP_2maboveground' },
        { name: 'Temperature Min', value: 'TMIN_2maboveground' },
        { name: 'Temperature Max', value: 'TMAX_2maboveground' },
        // { name: 'Wind 2M', value: 'wind2m' },
        { name: 'Low Cloud', value: 'TCDC_lowcloudlayer' },
        { name: 'Precipitation', value: 'APCP_surface' }
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
                        'background-image': "url(" + makeImgUrl(state.selectedModel, state.selectedRun, state.selectedStep.step, state.selectedParameter, state.selectedRegion) + ")"
                    }
                }),
                nimble_1.h('div.img-preload', steps
                    .slice(selectedStepIndex - 3, selectedStepIndex + 3)
                    .map(function (step) {
                    return nimble_1.h('img', { src: makeImgUrl(state.selectedModel, state.selectedRun, step.step, state.selectedParameter, state.selectedRegion) });
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
// $.getJSON(`/api/mapData`)
//     .then((data: any) => {
//         const { regions, parameters } = data;
//         affect.set('regions', regions);
//         affect.set('parameters', parameters);
//     });
