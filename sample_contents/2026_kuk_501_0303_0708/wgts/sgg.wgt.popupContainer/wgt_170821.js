(function (wgtName, xa) {
    xa.version = "2.12";
    console.info(wgtName, xa.version);
    xa.exeItrNoResize = false;
    xa.exeItrNoZoom = false;
    xa.exeItrNoMove = false;
    xa.styleMap.dragX = false;
    xa.styleMap.dragY = false;
    xa.styleMap.dragInParent = false;
    xa.styleMap.dragContainParent = false;
    xa.styleMap.visibility = false;
    xa.styleMap.alpha = false;
    xa.styles = { visibility: false };
    xa.dynamic = {
        depth: 2000000000
    };
    xa.editor = xa.editor || {};
    xa.editor.properties = {};
    xa.editor.properties.fireReset = { title: "Reset여부", input: ["예", "아니오"] };
    xa.properties = xa.properties || {};
    xa.properties.attrs = xa.properties.attrs || {};
    xa.properties.attrs.fireReset = "예";
    xa.properties.attrs.layerReset = true;
    xa.properties.attrs.Effect = "None";
    xa.properties.attrs.apxStep = undefined;
    xa.properties.attrs.visible = false;
    xa.properties.attrs.cfg = {
        modal: "아니오",
        blockPassInput: "예",
        stopSound: "예",
        closeInfo: {}
    };
    xa.edtOnConfig = function (apd, widgetId) {
        var cfg = apd.wgtGetProperty(widgetId, "cfg");
        var i, j, ids, dlg, wgtList, wgtInfo = {}, wgtIds, classTitle, label, layers;
        if (cfg.blockPassInput == undefined) {
            cfg.blockPassInput = "예";
        }
        function onOk() {
            eduLib.edtInputApplyAll(apd, dlg);
            for (var k in cfg.closeInfo) {
                if (!wgtInfo[k]) {
                    delete cfg.closeInfo[k];
                    continue;
                }
                cfg.closeInfo[k].closeButtonId = wgtInfo[k].wgtIds[wgtInfo[k].wgtList.indexOf(cfg.closeInfo[k].closeButton)];
                apd.wgtSetProperty(cfg.closeInfo[k].closeButtonId, "apxType", "popupCloseButton");
            }
            apd.wgtSetProperty(widgetId, "cfg", cfg);
        }
        if (dlg = apd.dlgDoModal(600, 500, onOk)) {
            layers = sg.aspen.getLayersInfo(apd, widgetId);
            eduLib.edtInputAdd(apd, dlg, {
                type: "select",
                title: "배경 가리기",
                options: ["예", "아니오"],
                value: cfg,
                key: "modal"
            });
            eduLib.edtInputAdd(apd, dlg, {
                type: "select",
                title: "인터렉션 막기",
                options: ["예", "아니오"],
                value: cfg,
                key: "blockPassInput"
            });
            eduLib.edtInputAdd(apd, dlg, {
                type: "select",
                title: "전체사운드정지",
                options: ["예", "아니오"],
                value: cfg,
                key: "stopSound"
            });
            for (i in layers) {
                if (!layers[i])
                    continue;
                if (layers[i].title == "null")
                    continue;
                ids = apd.wgtByClass(layers[i].id);
                wgtList = [""];
                wgtIds = [""];
                for (j in ids) {
                    label = apd.wgtGetProperty(ids[j], "apxLabel");
                    if (label) {
                        wgtList.push(label);
                        wgtIds.push(ids[j]);
                    }
                }
                wgtInfo[i] = {
                    wgtIds: wgtIds,
                    wgtList: wgtList
                };
                if (!cfg.closeInfo[i]) {
                    cfg.closeInfo[i] = {
                        closeButton: "",
                        closeButtonId: ""
                    };
                }
                eduLib.edtInputAdd(apd, dlg, {
                    type: "select",
                    title: layers[i].title + " 닫기버튼",
                    options: wgtList,
                    value: cfg.closeInfo[i],
                    key: "closeButton"
                });
            }
        }
    };
    xa.exeCreateTag = function (viewer, canvas, objData, zx, zy) {
        var tag = document.body.$TAG('DIV', { style: 'position:absolute;overflow:hidden;' });
        tag.$CSS({ boxSizing: 'border-box' });
        tag.apnCur = {};
        var useCover = false;
        if (objData.create.data.properties && objData.create.data.properties.attrs && objData.create.data.properties.attrs.cfg) {
            if (objData.create.data.properties.attrs.cfg.modal == '예')
                useCover = true;
        }
        if (useCover) {
            tag._tagBlock = tag.$TAG('DIV', { style: 'position:absolute;left:0px;top:0px;width:100%;height:100%;z-index:1;background-color:rgba(0, 0, 0, 0.4)' });
        }
        return tag;
    };
    xa.createAsCanvasObject = function (prj, position, size, styles, property) {
        return apn.IWidget.createCanvasObject(prj, this, "apn.CFixedLayerContainer", bx.CCanvasWnd.SHAPE_RECT, position, size, styles, property, {
            CFixedLayerContainer: ["null", "Pane1"]
        });
    };
    xa.exeOnLoad = function (apx, widgetId) {
        if (apx.wgtGetProperty(widgetId, "Effect") === undefined) {
            apx.wgtSetProperty(widgetId, "Effect", "None");
        }
        var layerInfo = sg.aspen.getLayersInfo(apx, widgetId);
        var nullStateId = sg.aspen.getStateIdByLayerTitle(sg.aspen.getStatesInfo(apx, widgetId), "null");
        if (!nullStateId) {
            apx.log(widgetId, '팝업닫기 상태인 "null"이름의 레이어가 존재해야합니다.');
        }
        var tag = apx.wgtTag(widgetId);
        var cfg = apx.wgtGetProperty(widgetId, "cfg");
        var isBlockPassInput = (cfg.blockPassInput == '예' || cfg.blockPassInput == undefined);
        if (!isBlockPassInput) {
            tag.apxOnEvent = function (apx, event, clientX, clientY, canvasX, canvasY, originEvent) {
                if (event == "tapStart") {
                    if (Array.prototype.indexOf.call(tag.children, originEvent.target) > -1) {
                        apx.tagPassPointerEvent(tag, true);
                        var fc;
                        if (bx.HCL.DV.isMobile()) {
                            document.addEventListener("touchend", fc = function (e) {
                                document.removeEventListener("touchend", fc);
                                apx.tagPassPointerEvent(tag, false);
                            });
                        }
                        else {
                            document.addEventListener("mouseup", fc = function (e) {
                                document.removeEventListener("mouseup", fc);
                                apx.tagPassPointerEvent(tag, false);
                            });
                        }
                    }
                }
                return true;
            };
        }
        tag._nullStateId = nullStateId;
        var ids = [], d, t;
        var pageObj = apx.project.pages[apx.getPageID()];
        for (var i in layerInfo) {
            ids = apx.widgetsByClass(undefined, layerInfo[i].id);
            ids.map(function (v, i, arr) {
                d = pageObj.objects[v].create.data;
                if (d && d.styles && (d.styles.dragX || d.styles.dragY)) {
                    apx.wgtSetProperty(v, "apxType", "draggable");
                    t = apx.wgtTag(v);
                    t._popup_originPos = sg.dom.getPosition(t);
                }
            });
        }
        tag._setVisible = function (bool) {
            apx.wgtSetProperty(tag.apnOID, "visible", bool, true);
            if (bool == true) {
                apx.runITR({ action: "CWP", set: { position: { x: 0, y: 0 } }, target: { objectID: widgetId } });
                tag.style.zIndex = ++xa.dynamic.depth;
                tag.style.display = "block";
                apx.fireEvent("wgtEvent", "opened", widgetId);
            }
            else {
                tag.style.display = "none";
                apx.fireEvent("wgtEvent", "closed", widgetId);
            }
        };
        var cfg = apx.wgtGetProperty(widgetId, "cfg");
        function onClose() {
            var j, idsMedia = apx.getWidgetsByProperty("apxMediaControl", widgetId);
            for (j = 0; j < idsMedia.length; j++) {
                if (apx.wgtGetProperty(idsMedia[j], "apxState") != "stop") {
                    apx.wgtControlMedia(idsMedia[j], 'stop');
                    apx.wgtSetProperty(idsMedia[j], "apxState", "stop");
                }
            }
            apx.stateLayerActivate(widgetId, tag._nullStateId);
            apx.stateSetActive(widgetId, tag._nullStateId);
        }
        for (i in cfg.closeInfo) {
            if (cfg.closeInfo[i] && cfg.closeInfo[i].closeButtonId) {
                t = apx.wgtTag(cfg.closeInfo[i].closeButtonId);
                if (!t) {
                    apx.log(widgetId, "팝업닫기버튼(" + cfg.closeInfo[i].closeButton + ")이 id가 바뀌었습니다. setup창에서 다시 선택해주세요.");
                    if (layerInfo[i]) {
                        ids = apx.widgetsByClass(undefined, layerInfo[i].id);
                        for (var j in ids) {
                            if (apx.wgtGetProperty(ids[j], "apxType") == "popupCloseButton") {
                                cfg.closeInfo[i].closeButtonId = ids[j];
                                t = apx.wgtTag(ids[j]);
                                break;
                            }
                        }
                    }
                }
                if (t) {
                    t.style.cursor = "pointer";
                    if (bx.HCL.DV.isMobile()) {
                        t.addEventListener("touchstart", onClose);
                    }
                    else {
                        t.addEventListener("click", onClose);
                    }
                }
            }
        }
    };
    xa.exeSetState = function (apx, tag, stateId, oldStateId) {
        this.parentClass.exeSetState.call(this, apx, tag, stateId, oldStateId);
        if (oldStateId !== undefined) {
            var cfg = apx.wgtGetProperty(tag.apnOID, "cfg");
            var i, j, idsWgt, idsMedia, st;
            var layerId, pageId = apx.getPageID();
            var stateInfo = apn.Project.getStateByObjectID(apx.project, pageId, tag.apnOID);
            if (cfg.stopSound == "예") {
                idsMedia = apx.getWidgetsByProperty("apxMediaControl");
                for (j = 0; j < idsMedia.length; j++) {
                    st = apx.wgtGetProperty(idsMedia[j], "apxState");
                    if (st == "play" || st == "resume") {
                        apx.wgtControlMedia(idsMedia[j], 'stop');
                        apx.wgtSetProperty(idsMedia[j], "apxState", "stop");
                    }
                }
            }
        }
        if (typeof oldStateId === "undefined") {
            if (tag["_nullStateId"] && sg.aspen.getLayerTitleByStateId(sg.aspen.getStatesInfo(apx, tag.apnOID), apx.stateGetActive(tag.apnOID)) !== "null") {
                apx.stateLayerActivate(tag.apnOID, tag["_nullStateId"]);
                apx.stateSetActive(tag.apnOID, tag["_nullStateId"]);
            }
            return;
        }
        var t;
        tag._setVisible(stateId != tag["_nullStateId"]);
        if (oldStateId == stateId)
            return;
        var fr = apx.wgtGetProperty(tag.apnOID, "fireReset");
        if (fr == "아니오")
            return;
        for (i in stateInfo) {
            if (stateInfo[i].stateID == oldStateId && stateInfo[i].title != "null") {
                layerId = apn.Project.getStateLayerObjectID(apx.project, pageId, tag.apnOID, stateInfo[i].stateID);
                idsWgt = apx.widgetsByClass("ux.wgt.imgSprite", layerId);
                idsWgt = idsWgt.concat(apx.widgetsByClass("ux.wgt.shtSprite", layerId));
                idsWgt = idsWgt.concat(apx.widgetsByClass("edu.wgt.animScene", layerId));
                idsWgt = idsWgt.concat(apx.widgetsByClass("edu.wgt.animSprite", layerId));
                for (j = 0; j < idsWgt.length; j++) {
                    if (apx.wgtGetProperty(idsWgt[j], "apxState") !== "stop")
                        apx.wgtSetProperty(idsWgt[j], "apxState", "stop");
                    apx.wgtTag(idsWgt[j]).style.display = "block";
                }
                idsWgt = apx.widgetsByType("draggable", layerId);
                for (j = 0; j < idsWgt.length; j++) {
                    t = apx.wgtTag(idsWgt[j]);
                    if (t && t._popup_originPos) {
                        apx.wgtMoveTo(idsWgt[j], apx.toCanvasX(apx.tagX(t, t._popup_originPos.left)), apx.toCanvasY(apx.tagY(t, t._popup_originPos.top)));
                    }
                }
                break;
            }
        }
        var sid;
        for (i in stateInfo) {
            if (stateInfo[i].stateID == oldStateId) {
                layerId = apn.Project.getStateLayerObjectID(apx.project, pageId, tag.apnOID, stateInfo[i].stateID);
                idsWgt = apx.getWidgetsByProperty("sgReset", layerId);
                for (j = 0; j < idsWgt.length; j++) {
                    apx.wgtSetProperty(idsWgt[j], "sgReset", fr);
                }
                idsWgt = apx.getWidgetsByProperty("fireReset", layerId);
                for (j = 0; j < idsWgt.length; j++) {
                    if (apx.wgtGetProperty(idsWgt[j], "fireReset") === "예") {
                        if (apx.wgtGetProperty(idsWgt[j], "layerReset")) {
                            sg.aspen.setStateByOrder(apx, idsWgt[j], 0);
                        }
                    }
                }
            }
        }
    };
    xa.edtOnRemapObjectID = function (apd, data, map) {
        if (data && data.properties && data.properties.attrs && data.properties.attrs) {
            data.properties.attrs.visible = false;
            var cfg = data.properties.attrs.cfg;
            if (cfg && cfg.closeInfo) {
                var id;
                for (var i in cfg.closeInfo) {
                    if (cfg.closeInfo[i] && cfg.closeInfo[i].closeButtonId) {
                        id = cfg.closeInfo[i].closeButtonId;
                        if (map[id])
                            cfg.closeInfo[i].closeButtonId = map[id];
                        else if (!apd.getScreenData().objects[id])
                            cfg.closeInfo[i].closeButtonId = '';
                    }
                }
            }
        }
    };
    xa.edtOnBuildEvent = function (prj, oId, pageID, event) {
        event.wgtEvent = { value: 'wgtEvent', title: apn.P.eventTitle.wgtEvent, param: {
                opened: "PopupOpened",
                closed: "PopupClosed"
            } };
    };
    window[wgtName] = xa;
})("sggWgtPopupContainer", apn.inheritWidget(apn.widgets['apn.wgt.pagedContainer2']));
