(function (lib, img, cjs, ss) {

var p; // shortcut to reference prototypes
lib.webFontTxtFilters = {}; 

// library properties:
lib.properties = {
	width: 238,
	height: 274,
	fps: 30,
	color: "#CCCCCC",
	opacity: 1.00,
	webfonts: {},
	manifest: [
		{src:"./images/index_atlas_.png", id:"index_atlas_"}
	]
};



lib.ssMetadata = [
		{name:"index_atlas_", frames: [[310,0,187,122],[0,498,36,57],[822,584,36,57],[534,571,36,57],[326,564,36,57],[956,559,36,57],[860,585,36,57],[932,0,74,167],[481,277,33,55],[481,334,33,55],[742,260,63,53],[517,250,63,144],[38,498,33,55],[417,135,98,140],[665,591,33,55],[810,144,64,22],[742,315,66,12],[332,334,66,30],[79,558,75,40],[665,543,79,46],[898,585,41,45],[156,0,152,244],[700,591,33,55],[997,348,27,36],[1008,100,16,23],[169,556,78,40],[249,564,75,40],[379,554,75,45],[626,442,66,29],[156,598,33,55],[456,571,76,37],[746,584,74,34],[0,558,77,39],[740,329,64,12],[970,348,25,139],[129,251,22,30],[273,246,27,11],[970,489,46,68],[1008,0,14,98],[191,598,31,41],[392,453,31,40],[873,530,81,53],[0,0,154,249],[401,277,78,102],[583,543,80,53],[631,144,85,111],[751,489,120,52],[287,504,90,58],[75,490,92,66],[499,0,113,133],[517,144,112,104],[810,249,103,93],[907,144,22,22],[873,456,95,72],[614,0,104,142],[827,0,103,142],[720,0,105,140],[310,124,105,139],[582,372,114,68],[0,251,127,69],[273,265,126,67],[332,381,110,70],[444,396,79,97],[129,310,23,18],[720,142,88,116],[698,402,86,85],[786,402,85,85],[75,403,84,85],[161,403,84,85],[884,348,75,106],[876,144,29,19],[497,515,84,54],[582,260,158,54],[746,543,91,39],[626,489,123,52],[248,334,82,97],[810,169,124,78],[936,169,83,73],[525,442,99,71],[582,316,156,54],[740,344,142,56],[129,283,25,25],[0,322,124,67],[392,495,103,57],[169,504,116,50],[126,332,120,69],[156,246,115,84],[915,249,95,97],[0,391,73,105],[247,453,143,49],[525,396,35,41]]}
];


lib.webfontAvailable = function(family) { 
	lib.properties.webfonts[family] = true;
	var txtFilters = lib.webFontTxtFilters && lib.webFontTxtFilters[family] || [];
	for(var f = 0; f < txtFilters.length; ++f) {
		txtFilters[f].updateCache();
	}
};
// symbols:



(lib.비트맵1 = function() {
	this.spriteSheet = ss["index_atlas_"];
	this.gotoAndStop(0);
}).prototype = p = new cjs.Sprite();



(lib.비트맵10 = function() {
	this.spriteSheet = ss["index_atlas_"];
	this.gotoAndStop(1);
}).prototype = p = new cjs.Sprite();



(lib.비트맵11 = function() {
	this.spriteSheet = ss["index_atlas_"];
	this.gotoAndStop(2);
}).prototype = p = new cjs.Sprite();



(lib.비트맵12 = function() {
	this.spriteSheet = ss["index_atlas_"];
	this.gotoAndStop(3);
}).prototype = p = new cjs.Sprite();



(lib.비트맵13 = function() {
	this.spriteSheet = ss["index_atlas_"];
	this.gotoAndStop(4);
}).prototype = p = new cjs.Sprite();



(lib.비트맵14 = function() {
	this.spriteSheet = ss["index_atlas_"];
	this.gotoAndStop(5);
}).prototype = p = new cjs.Sprite();



(lib.비트맵15 = function() {
	this.spriteSheet = ss["index_atlas_"];
	this.gotoAndStop(6);
}).prototype = p = new cjs.Sprite();



(lib.비트맵159 = function() {
	this.spriteSheet = ss["index_atlas_"];
	this.gotoAndStop(7);
}).prototype = p = new cjs.Sprite();



(lib.비트맵16 = function() {
	this.spriteSheet = ss["index_atlas_"];
	this.gotoAndStop(8);
}).prototype = p = new cjs.Sprite();



(lib.비트맵17 = function() {
	this.spriteSheet = ss["index_atlas_"];
	this.gotoAndStop(9);
}).prototype = p = new cjs.Sprite();



(lib.비트맵170 = function() {
	this.spriteSheet = ss["index_atlas_"];
	this.gotoAndStop(10);
}).prototype = p = new cjs.Sprite();



(lib.비트맵171 = function() {
	this.spriteSheet = ss["index_atlas_"];
	this.gotoAndStop(11);
}).prototype = p = new cjs.Sprite();



(lib.비트맵18 = function() {
	this.spriteSheet = ss["index_atlas_"];
	this.gotoAndStop(12);
}).prototype = p = new cjs.Sprite();



(lib.비트맵183 = function() {
	this.spriteSheet = ss["index_atlas_"];
	this.gotoAndStop(13);
}).prototype = p = new cjs.Sprite();



(lib.비트맵19 = function() {
	this.spriteSheet = ss["index_atlas_"];
	this.gotoAndStop(14);
}).prototype = p = new cjs.Sprite();



(lib.비트맵193 = function() {
	this.spriteSheet = ss["index_atlas_"];
	this.gotoAndStop(15);
}).prototype = p = new cjs.Sprite();



(lib.비트맵194 = function() {
	this.spriteSheet = ss["index_atlas_"];
	this.gotoAndStop(16);
}).prototype = p = new cjs.Sprite();



(lib.비트맵195 = function() {
	this.spriteSheet = ss["index_atlas_"];
	this.gotoAndStop(17);
}).prototype = p = new cjs.Sprite();



(lib.비트맵196 = function() {
	this.spriteSheet = ss["index_atlas_"];
	this.gotoAndStop(18);
}).prototype = p = new cjs.Sprite();



(lib.비트맵197 = function() {
	this.spriteSheet = ss["index_atlas_"];
	this.gotoAndStop(19);
}).prototype = p = new cjs.Sprite();



(lib.비트맵199 = function() {
	this.spriteSheet = ss["index_atlas_"];
	this.gotoAndStop(20);
}).prototype = p = new cjs.Sprite();



(lib.비트맵2 = function() {
	this.spriteSheet = ss["index_atlas_"];
	this.gotoAndStop(21);
}).prototype = p = new cjs.Sprite();



(lib.비트맵20 = function() {
	this.spriteSheet = ss["index_atlas_"];
	this.gotoAndStop(22);
}).prototype = p = new cjs.Sprite();



(lib.비트맵200 = function() {
	this.spriteSheet = ss["index_atlas_"];
	this.gotoAndStop(23);
}).prototype = p = new cjs.Sprite();



(lib.비트맵201 = function() {
	this.spriteSheet = ss["index_atlas_"];
	this.gotoAndStop(24);
}).prototype = p = new cjs.Sprite();



(lib.비트맵204 = function() {
	this.spriteSheet = ss["index_atlas_"];
	this.gotoAndStop(25);
}).prototype = p = new cjs.Sprite();



(lib.비트맵205 = function() {
	this.spriteSheet = ss["index_atlas_"];
	this.gotoAndStop(26);
}).prototype = p = new cjs.Sprite();



(lib.비트맵206 = function() {
	this.spriteSheet = ss["index_atlas_"];
	this.gotoAndStop(27);
}).prototype = p = new cjs.Sprite();



(lib.비트맵209 = function() {
	this.spriteSheet = ss["index_atlas_"];
	this.gotoAndStop(28);
}).prototype = p = new cjs.Sprite();



(lib.비트맵21 = function() {
	this.spriteSheet = ss["index_atlas_"];
	this.gotoAndStop(29);
}).prototype = p = new cjs.Sprite();



(lib.비트맵210 = function() {
	this.spriteSheet = ss["index_atlas_"];
	this.gotoAndStop(30);
}).prototype = p = new cjs.Sprite();



(lib.비트맵211 = function() {
	this.spriteSheet = ss["index_atlas_"];
	this.gotoAndStop(31);
}).prototype = p = new cjs.Sprite();



(lib.비트맵212 = function() {
	this.spriteSheet = ss["index_atlas_"];
	this.gotoAndStop(32);
}).prototype = p = new cjs.Sprite();



(lib.비트맵22 = function() {
	this.spriteSheet = ss["index_atlas_"];
	this.gotoAndStop(33);
}).prototype = p = new cjs.Sprite();



(lib.비트맵23 = function() {
	this.spriteSheet = ss["index_atlas_"];
	this.gotoAndStop(34);
}).prototype = p = new cjs.Sprite();



(lib.비트맵238 = function() {
	this.spriteSheet = ss["index_atlas_"];
	this.gotoAndStop(35);
}).prototype = p = new cjs.Sprite();



(lib.비트맵24 = function() {
	this.spriteSheet = ss["index_atlas_"];
	this.gotoAndStop(36);
}).prototype = p = new cjs.Sprite();



(lib.비트맵25 = function() {
	this.spriteSheet = ss["index_atlas_"];
	this.gotoAndStop(37);
}).prototype = p = new cjs.Sprite();



(lib.비트맵26 = function() {
	this.spriteSheet = ss["index_atlas_"];
	this.gotoAndStop(38);
}).prototype = p = new cjs.Sprite();



(lib.비트맵27 = function() {
	this.spriteSheet = ss["index_atlas_"];
	this.gotoAndStop(39);
}).prototype = p = new cjs.Sprite();



(lib.비트맵28 = function() {
	this.spriteSheet = ss["index_atlas_"];
	this.gotoAndStop(40);
}).prototype = p = new cjs.Sprite();



(lib.비트맵29 = function() {
	this.spriteSheet = ss["index_atlas_"];
	this.gotoAndStop(41);
}).prototype = p = new cjs.Sprite();



(lib.비트맵3 = function() {
	this.spriteSheet = ss["index_atlas_"];
	this.gotoAndStop(42);
}).prototype = p = new cjs.Sprite();



(lib.비트맵31 = function() {
	this.spriteSheet = ss["index_atlas_"];
	this.gotoAndStop(43);
}).prototype = p = new cjs.Sprite();



(lib.비트맵32 = function() {
	this.spriteSheet = ss["index_atlas_"];
	this.gotoAndStop(44);
}).prototype = p = new cjs.Sprite();



(lib.비트맵33 = function() {
	this.spriteSheet = ss["index_atlas_"];
	this.gotoAndStop(45);
}).prototype = p = new cjs.Sprite();



(lib.비트맵34 = function() {
	this.spriteSheet = ss["index_atlas_"];
	this.gotoAndStop(46);
}).prototype = p = new cjs.Sprite();



(lib.비트맵35 = function() {
	this.spriteSheet = ss["index_atlas_"];
	this.gotoAndStop(47);
}).prototype = p = new cjs.Sprite();



(lib.비트맵36 = function() {
	this.spriteSheet = ss["index_atlas_"];
	this.gotoAndStop(48);
}).prototype = p = new cjs.Sprite();



(lib.비트맵37 = function() {
	this.spriteSheet = ss["index_atlas_"];
	this.gotoAndStop(49);
}).prototype = p = new cjs.Sprite();



(lib.비트맵38 = function() {
	this.spriteSheet = ss["index_atlas_"];
	this.gotoAndStop(50);
}).prototype = p = new cjs.Sprite();



(lib.비트맵39 = function() {
	this.spriteSheet = ss["index_atlas_"];
	this.gotoAndStop(51);
}).prototype = p = new cjs.Sprite();



(lib.비트맵4 = function() {
	this.spriteSheet = ss["index_atlas_"];
	this.gotoAndStop(52);
}).prototype = p = new cjs.Sprite();



(lib.비트맵40 = function() {
	this.spriteSheet = ss["index_atlas_"];
	this.gotoAndStop(53);
}).prototype = p = new cjs.Sprite();



(lib.비트맵41 = function() {
	this.spriteSheet = ss["index_atlas_"];
	this.gotoAndStop(54);
}).prototype = p = new cjs.Sprite();



(lib.비트맵42 = function() {
	this.spriteSheet = ss["index_atlas_"];
	this.gotoAndStop(55);
}).prototype = p = new cjs.Sprite();



(lib.비트맵43 = function() {
	this.spriteSheet = ss["index_atlas_"];
	this.gotoAndStop(56);
}).prototype = p = new cjs.Sprite();



(lib.비트맵44 = function() {
	this.spriteSheet = ss["index_atlas_"];
	this.gotoAndStop(57);
}).prototype = p = new cjs.Sprite();



(lib.비트맵45 = function() {
	this.spriteSheet = ss["index_atlas_"];
	this.gotoAndStop(58);
}).prototype = p = new cjs.Sprite();



(lib.비트맵46 = function() {
	this.spriteSheet = ss["index_atlas_"];
	this.gotoAndStop(59);
}).prototype = p = new cjs.Sprite();



(lib.비트맵47 = function() {
	this.spriteSheet = ss["index_atlas_"];
	this.gotoAndStop(60);
}).prototype = p = new cjs.Sprite();



(lib.비트맵48 = function() {
	this.spriteSheet = ss["index_atlas_"];
	this.gotoAndStop(61);
}).prototype = p = new cjs.Sprite();



(lib.비트맵49 = function() {
	this.spriteSheet = ss["index_atlas_"];
	this.gotoAndStop(62);
}).prototype = p = new cjs.Sprite();



(lib.비트맵5 = function() {
	this.spriteSheet = ss["index_atlas_"];
	this.gotoAndStop(63);
}).prototype = p = new cjs.Sprite();



(lib.비트맵50 = function() {
	this.spriteSheet = ss["index_atlas_"];
	this.gotoAndStop(64);
}).prototype = p = new cjs.Sprite();



(lib.비트맵51 = function() {
	this.spriteSheet = ss["index_atlas_"];
	this.gotoAndStop(65);
}).prototype = p = new cjs.Sprite();



(lib.비트맵52 = function() {
	this.spriteSheet = ss["index_atlas_"];
	this.gotoAndStop(66);
}).prototype = p = new cjs.Sprite();



(lib.비트맵53 = function() {
	this.spriteSheet = ss["index_atlas_"];
	this.gotoAndStop(67);
}).prototype = p = new cjs.Sprite();



(lib.비트맵54 = function() {
	this.spriteSheet = ss["index_atlas_"];
	this.gotoAndStop(68);
}).prototype = p = new cjs.Sprite();



(lib.비트맵56 = function() {
	this.spriteSheet = ss["index_atlas_"];
	this.gotoAndStop(69);
}).prototype = p = new cjs.Sprite();



(lib.비트맵6 = function() {
	this.spriteSheet = ss["index_atlas_"];
	this.gotoAndStop(70);
}).prototype = p = new cjs.Sprite();



(lib.비트맵60 = function() {
	this.spriteSheet = ss["index_atlas_"];
	this.gotoAndStop(71);
}).prototype = p = new cjs.Sprite();



(lib.비트맵61 = function() {
	this.spriteSheet = ss["index_atlas_"];
	this.gotoAndStop(72);
}).prototype = p = new cjs.Sprite();



(lib.비트맵62 = function() {
	this.spriteSheet = ss["index_atlas_"];
	this.gotoAndStop(73);
}).prototype = p = new cjs.Sprite();



(lib.비트맵63 = function() {
	this.spriteSheet = ss["index_atlas_"];
	this.gotoAndStop(74);
}).prototype = p = new cjs.Sprite();



(lib.비트맵64 = function() {
	this.spriteSheet = ss["index_atlas_"];
	this.gotoAndStop(75);
}).prototype = p = new cjs.Sprite();



(lib.비트맵65 = function() {
	this.spriteSheet = ss["index_atlas_"];
	this.gotoAndStop(76);
}).prototype = p = new cjs.Sprite();



(lib.비트맵66 = function() {
	this.spriteSheet = ss["index_atlas_"];
	this.gotoAndStop(77);
}).prototype = p = new cjs.Sprite();



(lib.비트맵67 = function() {
	this.spriteSheet = ss["index_atlas_"];
	this.gotoAndStop(78);
}).prototype = p = new cjs.Sprite();



(lib.비트맵68 = function() {
	this.spriteSheet = ss["index_atlas_"];
	this.gotoAndStop(79);
}).prototype = p = new cjs.Sprite();



(lib.비트맵69 = function() {
	this.spriteSheet = ss["index_atlas_"];
	this.gotoAndStop(80);
}).prototype = p = new cjs.Sprite();



(lib.비트맵7 = function() {
	this.spriteSheet = ss["index_atlas_"];
	this.gotoAndStop(81);
}).prototype = p = new cjs.Sprite();



(lib.비트맵70 = function() {
	this.spriteSheet = ss["index_atlas_"];
	this.gotoAndStop(82);
}).prototype = p = new cjs.Sprite();



(lib.비트맵71 = function() {
	this.spriteSheet = ss["index_atlas_"];
	this.gotoAndStop(83);
}).prototype = p = new cjs.Sprite();



(lib.비트맵72 = function() {
	this.spriteSheet = ss["index_atlas_"];
	this.gotoAndStop(84);
}).prototype = p = new cjs.Sprite();



(lib.비트맵73 = function() {
	this.spriteSheet = ss["index_atlas_"];
	this.gotoAndStop(85);
}).prototype = p = new cjs.Sprite();



(lib.비트맵74 = function() {
	this.spriteSheet = ss["index_atlas_"];
	this.gotoAndStop(86);
}).prototype = p = new cjs.Sprite();



(lib.비트맵75 = function() {
	this.spriteSheet = ss["index_atlas_"];
	this.gotoAndStop(87);
}).prototype = p = new cjs.Sprite();



(lib.비트맵76 = function() {
	this.spriteSheet = ss["index_atlas_"];
	this.gotoAndStop(88);
}).prototype = p = new cjs.Sprite();



(lib.비트맵86 = function() {
	this.spriteSheet = ss["index_atlas_"];
	this.gotoAndStop(89);
}).prototype = p = new cjs.Sprite();



(lib.비트맵9 = function() {
	this.spriteSheet = ss["index_atlas_"];
	this.gotoAndStop(90);
}).prototype = p = new cjs.Sprite();



(lib.FIZ34_Skate1_Torso = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// Layer 3
	this.instance = new lib.비트맵170();

	this.timeline.addTween(cjs.Tween.get(this.instance).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(0,0,63,53);


(lib.FIZ34_Skate1_PupilR = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// Layer 1
	this.shape = new cjs.Shape();
	this.shape.graphics.f("#000000").s().p("AgXAcIgEgPQgCgLAEgNQAHgYASgDQAYgEAEAlQACAMgHAOQgIAPgNACIgFABQgOAAgGgLg");
	this.shape.setTransform(2.9,4);

	this.timeline.addTween(cjs.Tween.get(this.shape).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(0,0,5.8,7.9);


(lib.FIZ34_Skate1_PupilL = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// Layer 1
	this.shape = new cjs.Shape();
	this.shape.graphics.f("#000000").s().p("AgbAiIgFgQQgDgNAEgPQAGgdAXgFQAcgGAHAqQADAOgHARQgJASgPADIgJABQgQAAgHgLg");
	this.shape.setTransform(3.5,4.6);

	this.timeline.addTween(cjs.Tween.get(this.shape).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(0,0,6.9,9.2);


(lib.FIZ34_Skate1_Nose = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// 레이어 2
	this.instance = new lib.비트맵27();

	this.timeline.addTween(cjs.Tween.get(this.instance).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(0,0,31,41);


(lib.FIZ34_Skate1_Mouth = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// Layer 5
	this.instance = new lib.비트맵195();
	this.instance.setTransform(-2,-1);

	this.instance_1 = new lib.비트맵196();
	this.instance_1.setTransform(-7,-6);

	this.instance_2 = new lib.비트맵197();
	this.instance_2.setTransform(-9,-10);

	this.instance_3 = new lib.비트맵199();
	this.instance_3.setTransform(7,1);

	this.instance_4 = new lib.비트맵200();
	this.instance_4.setTransform(9,2);

	this.instance_5 = new lib.비트맵201();
	this.instance_5.setTransform(12,2);

	this.instance_6 = new lib.비트맵204();
	this.instance_6.setTransform(-9,-8);

	this.instance_7 = new lib.비트맵205();
	this.instance_7.setTransform(-7,-6);

	this.instance_8 = new lib.비트맵206();
	this.instance_8.setTransform(-6,-7);

	this.instance_9 = new lib.비트맵209();
	this.instance_9.setTransform(-2,0);

	this.instance_10 = new lib.비트맵210();
	this.instance_10.setTransform(-7,-4);

	this.instance_11 = new lib.비트맵211();
	this.instance_11.setTransform(-6,-4);

	this.instance_12 = new lib.비트맵212();
	this.instance_12.setTransform(-5,-8);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[]}).to({state:[{t:this.instance}]},2).to({state:[{t:this.instance_1}]},1).to({state:[{t:this.instance_2}]},1).to({state:[]},1).to({state:[{t:this.instance_3}]},1).to({state:[{t:this.instance_4}]},1).to({state:[{t:this.instance_5}]},1).to({state:[]},1).to({state:[{t:this.instance_6}]},2).to({state:[{t:this.instance_7}]},1).to({state:[{t:this.instance_8}]},1).to({state:[]},1).to({state:[{t:this.instance_9}]},2).to({state:[{t:this.instance_10}]},1).to({state:[{t:this.instance_11}]},1).to({state:[{t:this.instance_12}]},1).to({state:[]},1).wait(26));

	// Teeth
	this.instance_13 = new lib.비트맵193();
	this.instance_13.setTransform(-2,3);

	this.instance_14 = new lib.비트맵194();
	this.instance_14.setTransform(-2,5);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.instance_13}]}).to({state:[{t:this.instance_14}]},1).to({state:[]},1).wait(44));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-2,3,64,22);


(lib.FIZ34_Skate1_HelmetStrapR_skatenormal = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// 레이어 2
	this.instance = new lib.비트맵26();
	this.instance.setTransform(-8,-74);

	this.timeline.addTween(cjs.Tween.get(this.instance).wait(2));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-8,-74,14,98);


(lib.FIZ34_Skate1_HelmetStrapL_skatenormal = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// 레이어 2
	this.instance = new lib.비트맵23();
	this.instance.setTransform(-13,-72);

	this.timeline.addTween(cjs.Tween.get(this.instance).wait(6));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-13,-72,25,139);


(lib.FIZ34_Skate1_Helmet = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// 레이어 2
	this.instance = new lib.비트맵1();
	this.instance.setTransform(-93,-61);

	this.timeline.addTween(cjs.Tween.get(this.instance).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-93,-61,187,122);


(lib.FIZ34_Skate1_Head = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// 레이어 2
	this.instance = new lib.비트맵2();
	this.instance.setTransform(-1,0);

	this.instance_1 = new lib.비트맵3();
	this.instance_1.setTransform(2,-4);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.instance}]}).to({state:[{t:this.instance_1}]},1).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-1,0,152,244);


(lib.FIZ34_Skate1_Hair = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// 레이어 2
	this.instance = new lib.비트맵25();
	this.instance.setTransform(129,130);

	this.timeline.addTween(cjs.Tween.get(this.instance).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(129,130,46,68);


(lib.FIZ34_Skate1_GlassesMid = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// 레이어 2
	this.instance = new lib.비트맵22();

	this.timeline.addTween(cjs.Tween.get(this.instance).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(0,0,64,12);


(lib.FIZ34_Skate1_GlassesArmL = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// 레이어 2
	this.instance = new lib.비트맵24();

	this.timeline.addTween(cjs.Tween.get(this.instance).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(0,0,27,11);


(lib.FIZ34_Skate1_EyeR = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// white
	this.instance = new lib.비트맵21();

	this.instance_1 = new lib.비트맵20();

	this.instance_2 = new lib.비트맵19();

	this.instance_3 = new lib.비트맵18();

	this.instance_4 = new lib.비트맵17();

	this.instance_5 = new lib.비트맵16();

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.instance}]}).to({state:[{t:this.instance_1}]},1).to({state:[{t:this.instance_2}]},1).to({state:[{t:this.instance_3}]},1).to({state:[{t:this.instance_4}]},1).to({state:[]},1).to({state:[{t:this.instance_5}]},3).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(0,0,33,55);


(lib.FIZ34_Skate1_EyeL = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// white
	this.instance = new lib.비트맵15();

	this.instance_1 = new lib.비트맵14();

	this.instance_2 = new lib.비트맵13();

	this.instance_3 = new lib.비트맵12();

	this.instance_4 = new lib.비트맵11();

	this.instance_5 = new lib.비트맵10();

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.instance}]}).to({state:[{t:this.instance_1}]},1).to({state:[{t:this.instance_2}]},1).to({state:[{t:this.instance_3}]},1).to({state:[{t:this.instance_4}]},1).to({state:[]},1).to({state:[{t:this.instance_5}]},5).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(0,0,36,57);


(lib.FIZ34_Skate1_EarL = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// 레이어 2
	this.instance = new lib.비트맵9();
	this.instance.setTransform(1,0);

	this.timeline.addTween(cjs.Tween.get(this.instance).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(1,0,35,41);


(lib.FIZ34_Skate1_CollarFR = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// 레이어 2
	this.instance = new lib.비트맵28();

	this.timeline.addTween(cjs.Tween.get(this.instance).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(0,0,31,40);


(lib.FIZ34_Skate1_CollarBK = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// 레이어 2
	this.instance = new lib.비트맵29();

	this.timeline.addTween(cjs.Tween.get(this.instance).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(0,0,81,53);


(lib.FIZ34_Skate1_BrowR = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// 레이어 2
	this.instance = new lib.비트맵5();

	this.instance_1 = new lib.비트맵4();
	this.instance_1.setTransform(-1,-3);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.instance}]}).to({state:[{t:this.instance_1}]},1).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(0,0,23,18);


(lib.FIZ34_Skate1_BrowL = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// 레이어 2
	this.instance = new lib.비트맵6();
	this.instance.setTransform(2,0);

	this.instance_1 = new lib.비트맵7();
	this.instance_1.setTransform(0,-4);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.instance}]}).to({state:[{t:this.instance_1}]},1).to({state:[]},1).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(2,0,29,19);


(lib.FIZ34_Skate1_Body = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// Layer 4
	this.instance = new lib.비트맵183();
	this.instance.setTransform(16,2);
	this.instance._off = true;

	this.timeline.addTween(cjs.Tween.get(this.instance).wait(35).to({_off:false},0).to({_off:true},1).wait(43));

	// Layer 3
	this.instance_1 = new lib.비트맵171();
	this.instance_1.setTransform(0,4);

	this.timeline.addTween(cjs.Tween.get(this.instance_1).to({_off:true},1).wait(78));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(0,4,63,144);


(lib.FIZ34_Skate1_ArmR = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// strap
	this.instance = new lib.비트맵31();
	this.instance.setTransform(16,-2);

	this.instance_1 = new lib.비트맵32();
	this.instance_1.setTransform(10,-42);

	this.instance_2 = new lib.비트맵33();
	this.instance_2.setTransform(4,-102);

	this.instance_3 = new lib.비트맵34();
	this.instance_3.setTransform(-28,-24);

	this.instance_4 = new lib.비트맵35();
	this.instance_4.setTransform(6,-48);

	this.instance_5 = new lib.비트맵36();
	this.instance_5.setTransform(1,-40);

	this.instance_6 = new lib.비트맵37();
	this.instance_6.setTransform(-21,-127);

	this.instance_7 = new lib.비트맵38();
	this.instance_7.setTransform(-19,-96);

	this.instance_8 = new lib.비트맵39();
	this.instance_8.setTransform(-11,-75);

	this.instance_9 = new lib.비트맵40();
	this.instance_9.setTransform(-4,-46);

	this.instance_10 = new lib.비트맵41();
	this.instance_10.setTransform(-11,-135);

	this.instance_11 = new lib.비트맵42();
	this.instance_11.setTransform(-11,-135);

	this.instance_12 = new lib.비트맵43();
	this.instance_12.setTransform(-13,-134);

	this.instance_13 = new lib.비트맵44();
	this.instance_13.setTransform(-13,-133);

	this.instance_14 = new lib.비트맵45();
	this.instance_14.setTransform(-24,-46);

	this.instance_15 = new lib.비트맵46();
	this.instance_15.setTransform(-34,-43);

	this.instance_16 = new lib.비트맵47();
	this.instance_16.setTransform(-36,-43);

	this.instance_17 = new lib.비트맵48();
	this.instance_17.setTransform(-20,-7);

	this.instance_18 = new lib.비트맵49();
	this.instance_18.setTransform(13,-10);

	this.instance_19 = new lib.비트맵50();
	this.instance_19.setTransform(3,-111);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[]}).to({state:[{t:this.instance}]},2).to({state:[]},1).to({state:[{t:this.instance_1}]},5).to({state:[{t:this.instance_2}]},1).to({state:[]},1).to({state:[{t:this.instance_3}]},1).to({state:[{t:this.instance_4}]},1).to({state:[{t:this.instance_5}]},1).to({state:[{t:this.instance_6}]},1).to({state:[{t:this.instance_7}]},1).to({state:[{t:this.instance_8}]},1).to({state:[{t:this.instance_9}]},1).to({state:[]},1).to({state:[{t:this.instance_10}]},1).to({state:[{t:this.instance_11}]},1).to({state:[{t:this.instance_12}]},1).to({state:[{t:this.instance_13}]},1).to({state:[]},1).to({state:[{t:this.instance_14}]},1).to({state:[{t:this.instance_15}]},1).to({state:[{t:this.instance_16}]},1).to({state:[{t:this.instance_17}]},1).to({state:[{t:this.instance_18}]},1).to({state:[]},1).to({state:[{t:this.instance_19}]},28).to({state:[]},1).wait(32));

	// arm
	this.instance_20 = new lib.비트맵51();
	this.instance_20.setTransform(4,-79);

	this.instance_21 = new lib.비트맵52();
	this.instance_21.setTransform(6,-79);

	this.instance_22 = new lib.비트맵53();
	this.instance_22.setTransform(7,-79);

	this.instance_23 = new lib.비트맵54();
	this.instance_23.setTransform(6,-79);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[]}).to({state:[{t:this.instance_20}]},58).to({state:[{t:this.instance_21}]},1).to({state:[{t:this.instance_22}]},1).to({state:[{t:this.instance_23}]},1).to({state:[]},1).wait(28));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-17,4,88,75);


(lib.FIZ34_Skate1_ArmL = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// strap
	this.instance = new lib.비트맵56();
	this.instance.setTransform(-5,-2);

	this.instance_1 = new lib.비트맵60();
	this.instance_1.setTransform(-4,-10);

	this.instance_2 = new lib.비트맵61();
	this.instance_2.setTransform(-5,-1);

	this.instance_3 = new lib.비트맵62();
	this.instance_3.setTransform(-3,-10);

	this.instance_4 = new lib.비트맵63();
	this.instance_4.setTransform(-5,-10);

	this.instance_5 = new lib.비트맵64();
	this.instance_5.setTransform(-3,-3);

	this.instance_6 = new lib.비트맵65();
	this.instance_6.setTransform(-4,-3);

	this.instance_7 = new lib.비트맵66();
	this.instance_7.setTransform(-24,13);

	this.instance_8 = new lib.비트맵67();
	this.instance_8.setTransform(-26,-5);

	this.instance_9 = new lib.비트맵68();
	this.instance_9.setTransform(-2,-42);

	this.instance_10 = new lib.비트맵69();
	this.instance_10.setTransform(-2,-30);

	this.instance_11 = new lib.비트맵70();
	this.instance_11.setTransform(-3,-18);

	this.instance_12 = new lib.비트맵71();
	this.instance_12.setTransform(-4,-2);

	this.instance_13 = new lib.비트맵73();
	this.instance_13.setTransform(-4,-4);

	this.instance_14 = new lib.비트맵74();
	this.instance_14.setTransform(-1,-4);

	this.instance_15 = new lib.비트맵75();
	this.instance_15.setTransform(-3,-2);

	this.instance_16 = new lib.비트맵76();
	this.instance_16.setTransform(-2,-4);

	this.instance_17 = new lib.비트맵86();
	this.instance_17.setTransform(-23,-4);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[]}).to({state:[{t:this.instance}]},1).to({state:[]},1).to({state:[{t:this.instance_1}]},4).to({state:[{t:this.instance_2}]},1).to({state:[{t:this.instance_3}]},1).to({state:[{t:this.instance_4}]},1).to({state:[{t:this.instance_5}]},1).to({state:[{t:this.instance_6}]},1).to({state:[]},1).to({state:[{t:this.instance_7}]},1).to({state:[{t:this.instance_8}]},1).to({state:[{t:this.instance_9}]},1).to({state:[{t:this.instance_10}]},1).to({state:[{t:this.instance_11}]},1).to({state:[{t:this.instance_12}]},1).to({state:[]},1).to({state:[{t:this.instance_13}]},2).to({state:[{t:this.instance_14}]},1).to({state:[{t:this.instance_15}]},1).to({state:[{t:this.instance_16}]},1).to({state:[]},1).to({state:[{t:this.instance_17}]},12).to({state:[]},1).wait(45));

	// strap
	this.instance_18 = new lib.비트맵72();
	this.instance_18.setTransform(-2,1);
	this.instance_18._off = true;

	this.timeline.addTween(cjs.Tween.get(this.instance_18).wait(20).to({_off:false},0).to({_off:true},1).wait(62));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-3,-2,110,122);


(lib.FIZ34_Skate1_ApronTieBK = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// Layer 1
	this.instance = new lib.비트맵238();

	this.timeline.addTween(cjs.Tween.get(this.instance).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(0,0,22,30);


(lib.FIZ34_Skate1_Apron_flap = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// rocket
	this.shape = new cjs.Shape();
	this.shape.graphics.f("#8089DD").s().p("AhACGQAUgEAggKQA7gSAygXIAAAAIADgBIAGAQIgFABIhgAtIg3AQIgCABgAhYheQgHgBgFgKQgDgJgBgLQgEgUARgHQARgIAKAHQAKAHAFASQAFASgYAMQgLAEgHAAIgCAAg");
	this.shape.setTransform(64,86.7);

	this.shape_1 = new cjs.Shape();
	this.shape_1.graphics.f("#FF7C66").s().p("AiBDuQgKgVgEgyQgEgyAMgdQAHAUAJAUIAIAOQgBACADAFIAAABIABAAIAAgBIAGAKIADAFQgRAJAAAxIgBAmIgMgWgAgbD5IgCgZIAFgrQAXgGAegNIATgIIABACIAAABQAZAlAQAOIhNAfQgPAHgUADIgFAAgACfCcQgEgHgMgNQgIgIgPgLQgNgIgJgCIgghOIgHgQIAEgCQAkAUAOASQAkArANAfQAHANACAiQgFgEgHgKgAhpB4QhGiVAFimIAHgBQAHgBASgHQAQgGAFgFIAVATQAvA3AKASIBaCfIAOAjIgFACIAAAAIg5AWQhSAcgUAJgAiBiYQgRAIAAAbQABAUAEAKQAGANAGAEQAQAMAegOQATgJADgXQABgRgEgKQgNgbgZAAQgMAAgPAGgAinjzIAEgQQAYAQAGANIgCABIgiAPIACgdg");
	this.shape_1.setTransform(66.7,85.5);

	this.shape_2 = new cjs.Shape();
	this.shape_2.graphics.f("#000000").s().p("AiAEOIAAAAIgNgYQgQgkgFggQgEggAIgkQAIgjAHgPQgXg8gLhJQgRh1AXhhIAAgBIABAAIAAAAQB+BWBbC6QAPAGAaANQAbAQAaAhQAbAhAJAXQAIAWABAUQAAAUgJATIAAAAIgBAAIgBAAQgVgbgOgOQgQgQgSgLQAAABgBAAQAAAAAAAAQAAAAgBAAQAAAAAAAAIgFgCIgJAFQgIAHgTAKIAaAbQAVAYACAGQAEAJgJAEIgCACQgHAHgeAOQg3AagfABQgLABgGgCIgGABQAAAAgBAAQAAAAAAAAQAAAAAAAAQAAAAAAAAIgBgBIgCgEIgBgBIABgDIgBgDIAAgBIABgBIAAAAQABgsAGgXQgRAFgYAFIgBAAIgBAAIgHgMQgEACgFAIQgOAvAKAjIACANIgBADIgBABIgFABQgJAAgNgTgAiOCiQADAyALAVIALAWIABgmQAAgxASgJIgDgFIgGgKIAAABIgBAAIAAgBQgDgFABgCIgIgOQgJgUgHgUQgNAdAFAygAAeCdQgfANgXAGIgEArIABAZIAFAAQAUgDAPgHIBNgfQgPgOgZglIAAgBIgBgCIgTAIgAA7AIIAHAQIAhBOQAJACANAIQAPALAHAIQAMANAEAHQAHAKAGAEQgDgigGgNQgOgfgjgrQgPgSgjgUIgHgEIACAGgABGBWIAAAAQgyAXg7ASQggAKgUAEIAMAXIACgBIA5gQIBegtIAFgBIgGgQIgDABgAiKjRQgRAHgHABIgIABQgECmBFCVIAHAMQATgJBSgcIA5gWIAAAAIAFgBIAAgBIgOgjIhZifQgKgSgwg3IgVgTQgFAFgQAGgAimj4IgDAdIAjgPIACgBIAAAAQgHgNgYgQgAiAhLQgGgEgGgNQgFgKAAgUQAAgbARgIQAtgUATApQAFAKgCARQgDAXgSAJQgRAIgMAAQgKAAgHgGgAh2iRQgRAHAEAUQABALADAJQAFAKAHABQAIABAMgFQAYgMgFgSQgFgSgKgHQgFgDgGAAQgHAAgJAEg");
	this.shape_2.setTransform(66.7,86);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[]}).to({state:[{t:this.shape_2},{t:this.shape_1},{t:this.shape}]},11).wait(1));

	// line
	this.shape_3 = new cjs.Shape();
	this.shape_3.graphics.f("#FFFFFF").s().p("AhTKyQAIgvAAhYIgGheIgFhNIAAAAIgCgTIgCgSQAAgJgKg0IgKg3QgBgRgKgwIgKgvQAAgIgiiRQgBgUhNjDIAAAAIgUgxIgchCIgNghIgDgGIAAAAQgNgdgUgnQg7hvAAgRQAAgNAJAAQAMAABNCzQBHCiAgAQIAAgBQAEAHATAAQA2AABIgmQAxgZAPgXQADgFAAgEQAEhBgpg6Ighg5Qgeg0gSgkIAAAAQgyhGAug7QADgDAEgCQANABAKAIQAHAHAAAFIgEAcIAAAAIACAbIAAAGIASAzIgBAAIAAABIADAHIAAAAIAnBKIAAAAIAKAUQAfAxAeAzQBDByA1B3IBdC6QA9B/AdCAQAHAdAEAdQAaCdgBBbIgBBBInvBwQAIgcAFgcg");
	this.shape_3.setTransform(58,78.7);

	this.shape_4 = new cjs.Shape();
	this.shape_4.graphics.f("#000000").s().p("Ah7LvQAThQAAhVIgHhqQgEgnAAgTQAAgQgDgdIgBgMIgFguQgBgHgFgcQgGgcAAgJIgCgOIgDgPIgCgPQgEgMABgEQAAgFgIggQgJghAAgGIgFgcQgGgYAAgFQAAgmhCiwQhCisAAgGIgGgRIAAABQgYgtgihKQgyhsAAgLQgBgJAFgIQAHgRAVAAQATAABRC3QBQC1AXABIAGgBIACABQAQgEAKAAQAyABA6gqQAugjAAgJIgOgtQgTgpgqhJIgMgWIAAAAQgQgfgTgdQg0hWA3hOIABgBIAAAAIASgCQARACAOAKQAQANAAAQIgEAaIABATQACANAEAMQATBAAjA4IANAUQBHBtA6BzIAwBgQA2BrAxBsQAzByAeB6QAJAiAHAjQAeCVgHCZIgYAFIABhBQAChbgaidQgFgdgGgdQgdiAg+h/Ihci6Qg1h3hDhyQgegzgdgxIgMgUIgBAAIgmhKIAAAAIgDgHIAAgBIAAAAIgRgzIAAgGIgCgbIAAAAIAEgcQAAgFgIgHQgJgIgNgBQgFACgCADQguA7AyBGIAAAAQASAkAeA0IAgA5QAqA6gEBBQAAAEgDAFQgQAXgwAZQhIAmg2AAQgUAAgEgHIABABQghgQhGiiQhOizgLAAQgJAAAAANQAAARA7BwQAUAmANAdIAAAAIACAGIAOAhIAcBCIAUAxIAAAAQBNDDABAUQAiCRAAAIIAKAvQAKAwABARIAKA3QAKA0AAAJIABASIADATIAAAAIAFBNIAGBeQAABYgIAvQgFAcgIAcIgbAGIACgHg");
	this.shape_4.setTransform(58.2,78.1);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[]}).to({state:[{t:this.shape_4},{t:this.shape_3}]},11).wait(1));

	// Layer 7
	this.shape_5 = new cjs.Shape();
	this.shape_5.graphics.f("#FFFFFF").s().p("AkPBdIAEgXIAAgCQAPgoAAgGIAAAAQAEgEAEgCQAigOgBgFQAPgJCVglIBfgXQBXgTAcAAQASAAALgCIAMgDQAUAAARAMQAAAGADANIAMAiQAIAZAJAKIgBAAIgkgEQgVAAg3AQQg3AQgFAAIgMACQgoAEgVAAIgtgDIhKADQglAAhQAgQgsARgSAKIAAgEg");
	this.shape_5.setTransform(74,150);

	this.shape_6 = new cjs.Shape();
	this.shape_6.graphics.f("#000000").s().p("AkeBuQgDgDgBgHIgCgMQAEgRAAgGQADgPAAgGQAAgDACgEIACgEQAAgPANgFQANgGABAOIAAABQAAAFgPApIAAACIgEAXIgBADQASgJAsgSQBRgfAkAAIBLgDIAtACQAUAAApgEIAMgCQAFAAA3gPQA2gQAWAAIAkAEIAAAAIAAgBQgIgKgJgZIgLgiQgDgNAAgGIAAAAQgBgPALgJQAKgKAAAVQAAAlARAlIAQAgIAAACIABABQgDAIgLAAIgogEQgcAAg7ASQg5ASgYAAIhlgBIghACIgcABQgFAAgNADIgPADQgRAAhHAbIhCAcQgHAAgBgEg");
	this.shape_6.setTransform(74.3,150.1);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[]}).to({state:[{t:this.shape_6},{t:this.shape_5}]},11).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(16.1,-26.3,238.1,188.8);


(lib.FIZ34_Skate1_Apron = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// line
	this.instance = new lib.비트맵159();
	this.instance.setTransform(-10,5);
	this.instance._off = true;

	this.timeline.addTween(cjs.Tween.get(this.instance).wait(71).to({_off:false},0).to({_off:true},1).wait(29));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(0,2,74,167);


(lib.FIZ_34_tieloop = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// Layer 2
	this.shape = new cjs.Shape();
	this.shape.graphics.f("#DADEE0").s().p("AgrAjQghgJgSgDIAAAAIACgFQBAANAYACQAnAEARgYQAGgEgDgGQgCgEgLgIQgIgFgMgEIgDgCQgJgGgTACQgMgBgNABQgwAAgKALIAAgBQgIgFAFgIQABgCAIgDIAAADQAAABAAAAQAAAAAAAAQABABAAAAQABAAABAAQAogJAigDQA/gHAfAVQAKAHACAKQACAHgCABQgYAjgvAGIgRABQgZAAgbgHg");
	this.shape.setTransform(10.6,15.2);

	this.shape_1 = new cjs.Shape();
	this.shape_1.graphics.f("#000000").s().p("AhzAdIAAgEIAAAAIACgEQACgDAQAEIABAAQARADAhAJQAlAJAggDQAwgGAYgiQACgCgCgHQgDgKgKgHQgfgVg+AHQgiADgpAJQAAAAgBAAQAAAAgBgBQAAAAAAAAQgBAAAAgBIABgDIAAgBQALgQA+gGQBDgJAnAbQAjAYgTAZQghAxhUgDQgSAAgQgBIAEADQgpgKgkgUgAgEAgQgYgChAgNIgCgBIgBgBIgCgIIAAgBQAIgJBHARQAiAIAVgRIgFgEQgRgKg0AAQggAAgXADIAAAAIgBgBQgCgEACgCIABgBQAJgLAwAAQAOgBALABQARACAPAEQALAEAIAFQALAIADAEQACAGgGAEQgOAVghAAIgIgBg");
	this.shape_1.setTransform(10.7,15.3);

	this.shape_2 = new cjs.Shape();
	this.shape_2.graphics.f("#000000").s().p("AgKA5QgTgBgPgDIAEAEQgpgNgigWIAAgEIgBAAIACgEQADgDAQAFIAAAAQASAEAgAMQAlALAfgBQAwgEAagiQADgCgCgFQgCgKgKgHQgdgXg/ADQgiABgpAGQgBAAAAAAQgBgBAAAAQgBAAAAAAQAAgBAAAAIABgDIAAgBQAMgPA+gDQBDgEAmAdQAiAagVAYQgfAohCAAIgWgBgAgFAgQgYgEg/gRIgCgBIgBgBIgBgIIAAgBQAIgIBGAVQAhAKAWgPIgFgFQgQgLg0gEQgfgCgXADIAAgBIgBAAQgCgFACgCIABgBQAKgKAwADQANAAAMACQARADAOAFQALAEAIAGQAKAHACAGQACAGgGAEQgOARgcAAIgOgBg");
	this.shape_2.setTransform(10.6,15.5,1,1,-3);

	this.shape_3 = new cjs.Shape();
	this.shape_3.graphics.f("#DADEE0").s().p("AguAgQgggMgSgEIAAAAIADgFQA/ARAYAEQAmAGASgWQAGgEgCgGQgCgGgKgHQgIgGgLgEIgEgDQgHgGgUABQgMgCgNAAQgwgDgKAKIgBAAQgHgGAFgIQACgCAIgCIgBADQAAAAAAAAQAAABABAAQAAAAABAAQAAABABAAQApgGAigBQA/gDAdAXQAKAHACAKQACAFgDACQgaAigwAEIgGAAQgdAAghgKg");
	this.shape_3.setTransform(10.7,15.5,1,1,-3);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.shape_1,p:{rotation:0,x:10.7,y:15.3}},{t:this.shape,p:{rotation:0,y:15.2}}]}).to({state:[{t:this.shape,p:{rotation:3.5,y:15.9}},{t:this.shape_1,p:{rotation:3.5,x:10.6,y:16}}]},1).to({state:[{t:this.shape_3},{t:this.shape_2}]},1).wait(1));

	// Layer 1
	this.shape_4 = new cjs.Shape();
	this.shape_4.graphics.f("#DADEE0").s().p("AANA0QgZgFgdgSIAAAAQgngcgCAAIgFACIgBgCQAAgCABgDQACgEAEgCQAFAGASAJQAbARAagCQAygEAAgWIAAgBQgCgTgogQQgNgGgQgDQAVgBANADQAXADAQAOIAbASQAOAMABAHQABAQgNAOQgNANgRAEIgRAAIgRAAg");
	this.shape_4.setTransform(11.3,20.4);

	this.shape_5 = new cjs.Shape();
	this.shape_5.graphics.f("#000000").s().p("AgzAtQgdgTgOgUIAAgBIAAAAIABgBIABAAIAGgCQACAAAnAcIgBAAQAeASAZAFQANACAMgBIAIgBQARgEANgNQAOgOgCgQQAAgHgPgMIgagSQgRgOgXgDQgMgDgWABQAQADAPAGQAnAQABATIAAABQABAWgzAEQgZACgcgRQgSgJgFgGQAAAAgBgBQAAgBAAAAQgBgBAAAAQAAgBAAAAQAAgEAFgEIABgBIABABIAaARQARAJAbgCQAigDgBgFQgBgJgpgQQgKgEhDgJIAAAAIgBgBIAAgBIABAAIgDgBQAogGAmgSQAhADAiAQQA2AZACAgQACARgMASQgSAbgmADIgKAAQgmAAgmgag");
	this.shape_5.setTransform(11.7,20.3);

	this.shape_6 = new cjs.Shape();
	this.shape_6.graphics.f("#DADEE0").s().p("AAQAzQgZgDgegQIAAAAQgpgZgCAAIgFADIgBgCQgBgEACgDQABgDAEgBQAFADATAKQAdAPAZgEQAygHgCgWIAAgBQgDgUgpgNQgOgEgQgDQAVgCANACQAXACARAMIAcARQAPAKABAIQADAPgMAPQgMAOgRAFQgPACgOAAIgFAAg");
	this.shape_6.setTransform(11.2,20.1,1,1,3.3);

	this.shape_7 = new cjs.Shape();
	this.shape_7.graphics.f("#000000").s().p("AguAxQgfgRgPgTIgBgBIABAAIAAgBIACAAIAFgDQACAAApAZIAAAAQAeAQAZADQANABAMgBIAJgCQARgFAMgOQAMgPgDgQQgBgHgPgKIgcgRQgRgMgXgCQgNgCgVACQAQADAQAEQAnANADAUIAAABQACAWgyAHQgZAEgdgPQgTgKgFgDQgBgBAAgBQAAAAgBgBQAAAAAAgBQAAAAAAgBQgBgEAFgEIAAgBIABABIAcAPQARAIAbgEQAigEgBgGQgDgJgqgNQgJgDhEgFIAAAAIgBgBIAAgBIABAAIgDgBQAogJAkgUQAhAAAjAOQA4AVAEAhQADAQgLATQgQAcglAFIgSABQgiAAgjgUg");
	this.shape_7.setTransform(11.5,20,1,1,3.3);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.shape_5,p:{rotation:0,x:11.7,y:20.3}},{t:this.shape_4,p:{rotation:0,x:11.3,y:20.4}}]}).to({state:[{t:this.shape_5,p:{rotation:-4,x:11.8,y:19.4}},{t:this.shape_4,p:{rotation:-4,x:11.4,y:19.6}}]},1).to({state:[{t:this.shape_7},{t:this.shape_6}]},1).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-1,9.4,23.3,18.2);


(lib.FIZ34_Skate1_HeadNestks = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// pupils
	this.instance = new lib.FIZ34_Skate1_PupilL("single",0);
	this.instance.setTransform(121.6,186.4,1,1,0,0,0,3.5,4.6);

	this.instance_1 = new lib.FIZ34_Skate1_PupilR("single",0);
	this.instance_1.setTransform(39.6,185.4,1,1,0,0,0,2.9,4);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[]}).to({state:[{t:this.instance_1},{t:this.instance}]},92).to({state:[]},182).wait(741));

	// helmet
	this.instance_2 = new lib.FIZ34_Skate1_Helmet("single",0);
	this.instance_2.setTransform(106.8,111.2);
	this.instance_2._off = true;

	this.timeline.addTween(cjs.Tween.get(this.instance_2).wait(92).to({_off:false},0).to({_off:true},182).wait(741));

	// helmetstrapR
	this.instance_3 = new lib.FIZ34_Skate1_HelmetStrapL_skatenormal("single",0);
	this.instance_3.setTransform(160.1,137,0.999,0.999,3.7,0,0,-4,-63.3);
	this.instance_3._off = true;

	this.timeline.addTween(cjs.Tween.get(this.instance_3).wait(92).to({_off:false},0).wait(32).to({rotation:-0.6},0).wait(2).to({regY:-63.4,rotation:-5.9,y:136.9},0).wait(2).to({regY:-63.5,rotation:-7},0).wait(2).to({rotation:-5.9},0).wait(2).to({rotation:-4.8},0).wait(25).to({regY:-63.3,rotation:2.2,y:137},0).wait(2).to({regX:-4.1,rotation:6},0).wait(2).to({rotation:7.6},0).wait(2).to({rotation:8,y:136.9},0).wait(2).to({rotation:6.7},0).wait(2).to({rotation:6.6,y:137},0).wait(14).to({regX:-4,rotation:-0.6},0).wait(2).to({regY:-63.4,rotation:-5.9,y:136.9},0).wait(2).to({regY:-63.5,rotation:-7},0).wait(2).to({rotation:-5.9},0).wait(2).to({rotation:-4.8},0).wait(16).to({regY:-63.3,rotation:2.2,y:137},0).wait(2).to({regX:-4.1,rotation:6},0).wait(2).to({rotation:7.6},0).wait(2).to({rotation:8,y:136.9},0).wait(2).to({rotation:6.7},0).wait(2).to({rotation:6.6,y:137},0).wait(37).to({regY:-63.2,rotation:1.6},0).wait(2).to({regY:-63.3,scaleX:1,scaleY:1,rotation:-1.2},0).wait(2).to({regX:-4.2,regY:-63.4,rotation:-1.9,x:160},0).wait(2).to({rotation:-1.3},0).wait(2).to({regY:-63.5,rotation:-1,y:136.9},0).to({_off:true},14).wait(741));

	// browL
	this.instance_4 = new lib.FIZ34_Skate1_BrowL("single",1);
	this.instance_4.setTransform(127.9,135.4,0.999,0.999,-12.8,0,0,15.5,9.5);

	this.instance_5 = new lib.FIZ34_Skate1_BrowR("single",1);
	this.instance_5.setTransform(37.6,137.7,0.999,0.999,3.5,0,0,11.3,8.8);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[]}).to({state:[{t:this.instance_5,p:{x:37.6,y:137.7,regX:11.3,regY:8.8,scaleX:0.999,scaleY:0.999,rotation:3.5,startPosition:1}},{t:this.instance_4,p:{x:127.9,y:135.4,scaleX:0.999,scaleY:0.999,rotation:-12.8,startPosition:1,regY:9.5}}]},92).to({state:[{t:this.instance_5,p:{x:37.7,y:135.7,regX:11.3,regY:8.8,scaleX:0.999,scaleY:0.999,rotation:3.5,startPosition:1}},{t:this.instance_4,p:{x:128,y:133.4,scaleX:0.999,scaleY:0.999,rotation:-12.8,startPosition:1,regY:9.5}}]},1).to({state:[{t:this.instance_5,p:{x:37.9,y:133.5,regX:11.3,regY:8.8,scaleX:0.999,scaleY:0.999,rotation:3.5,startPosition:1}},{t:this.instance_4,p:{x:128.2,y:131.2,scaleX:0.999,scaleY:0.999,rotation:-12.8,startPosition:1,regY:9.5}}]},1).to({state:[{t:this.instance_5,p:{x:37.9,y:134.1,regX:11.3,regY:8.8,scaleX:0.999,scaleY:0.999,rotation:3.5,startPosition:1}},{t:this.instance_4,p:{x:128.2,y:131.8,scaleX:0.999,scaleY:0.999,rotation:-12.8,startPosition:1,regY:9.5}}]},1).to({state:[{t:this.instance_5,p:{x:37.9,y:134.3,regX:11.3,regY:8.8,scaleX:0.999,scaleY:0.999,rotation:3.5,startPosition:1}},{t:this.instance_4,p:{x:128.2,y:132,scaleX:0.999,scaleY:0.999,rotation:-12.8,startPosition:1,regY:9.5}}]},2).to({state:[{t:this.instance_5,p:{x:37.8,y:133.7,regX:11.3,regY:8.8,scaleX:0.999,scaleY:0.999,rotation:3.5,startPosition:1}},{t:this.instance_4,p:{x:128.1,y:131.4,scaleX:0.999,scaleY:0.999,rotation:-12.8,startPosition:1,regY:9.5}}]},53).to({state:[{t:this.instance_5,p:{x:37.7,y:133.1,regX:11.3,regY:8.8,scaleX:0.999,scaleY:0.999,rotation:3.5,startPosition:1}},{t:this.instance_4,p:{x:128,y:130.8,scaleX:0.999,scaleY:0.999,rotation:-12.8,startPosition:1,regY:9.5}}]},2).to({state:[{t:this.instance_5,p:{x:37.2,y:139.1,regX:11.6,regY:9.2,scaleX:0.995,scaleY:0.995,rotation:9.5,startPosition:0}},{t:this.instance_4,p:{x:122,y:137.6,scaleX:0.995,scaleY:0.995,rotation:-10.7,startPosition:0,regY:9.5}}]},2).to({state:[{t:this.instance_5,p:{x:37.6,y:147.7,regX:11.6,regY:9.2,scaleX:0.996,scaleY:0.996,rotation:31.4,startPosition:0}},{t:this.instance_4,p:{x:121.4,y:146.2,scaleX:0.996,scaleY:0.996,rotation:-26.8,startPosition:0,regY:9.5}}]},1).to({state:[{t:this.instance_5,p:{x:37.1,y:158.7,regX:11.6,regY:9.2,scaleX:0.997,scaleY:0.997,rotation:43.2,startPosition:0}},{t:this.instance_4,p:{x:122.3,y:157.5,scaleX:0.997,scaleY:0.997,rotation:-40.8,startPosition:0,regY:9.5}}]},1).to({state:[{t:this.instance_5,p:{x:37.1,y:158.4,regX:11.6,regY:9.2,scaleX:0.997,scaleY:0.997,rotation:43.2,startPosition:0}},{t:this.instance_4,p:{x:122.3,y:157.2,scaleX:0.997,scaleY:0.997,rotation:-40.8,startPosition:0,regY:9.5}}]},1).to({state:[{t:this.instance_5,p:{x:37.1,y:157.8,regX:11.6,regY:9.2,scaleX:0.997,scaleY:0.997,rotation:43.2,startPosition:0}},{t:this.instance_4,p:{x:122.3,y:156.6,scaleX:0.997,scaleY:0.997,rotation:-40.8,startPosition:0,regY:9.5}}]},1).to({state:[{t:this.instance_5,p:{x:37.1,y:158.3,regX:11.6,regY:9.2,scaleX:0.997,scaleY:0.997,rotation:43.2,startPosition:0}},{t:this.instance_4,p:{x:122.3,y:157,scaleX:0.997,scaleY:0.997,rotation:-40.8,startPosition:0,regY:9.5}}]},19).to({state:[{t:this.instance_5,p:{x:37.1,y:158.7,regX:11.6,regY:9.2,scaleX:0.997,scaleY:0.997,rotation:43.2,startPosition:0}},{t:this.instance_4,p:{x:122.3,y:157.5,scaleX:0.997,scaleY:0.997,rotation:-40.8,startPosition:0,regY:9.5}}]},2).to({state:[{t:this.instance_5,p:{x:36.2,y:149.8,regX:11.6,regY:9.2,scaleX:0.995,scaleY:0.995,rotation:19.6,startPosition:0}},{t:this.instance_4,p:{x:121.1,y:147.9,scaleX:0.996,scaleY:0.996,rotation:-23.1,startPosition:0,regY:9.5}}]},1).to({state:[{t:this.instance_5,p:{x:37.2,y:141.9,regX:12.1,regY:9.4,scaleX:0.995,scaleY:0.995,rotation:5.3,startPosition:0}},{t:this.instance_4,p:{x:122.2,y:139.5,scaleX:0.995,scaleY:0.995,rotation:-5.2,startPosition:0,regY:9.5}}]},1).to({state:[{t:this.instance_5,p:{x:37.9,y:134.3,regX:11.3,regY:8.8,scaleX:0.999,scaleY:0.999,rotation:3.5,startPosition:1}},{t:this.instance_4,p:{x:128.2,y:132,scaleX:0.999,scaleY:0.999,rotation:-12.8,startPosition:1,regY:9.5}}]},1).to({state:[{t:this.instance_5,p:{x:37.6,y:133,regX:11.3,regY:8.8,scaleX:0.999,scaleY:0.999,rotation:3.5,startPosition:1}},{t:this.instance_4,p:{x:127.9,y:130.7,scaleX:0.999,scaleY:0.999,rotation:-12.8,startPosition:1,regY:9.5}}]},2).to({state:[{t:this.instance_5,p:{x:37.7,y:133.6,regX:11.3,regY:8.8,scaleX:0.999,scaleY:0.999,rotation:3.5,startPosition:1}},{t:this.instance_4,p:{x:128,y:131.3,scaleX:0.999,scaleY:0.999,rotation:-12.8,startPosition:1,regY:9.5}}]},2).to({state:[{t:this.instance_5,p:{x:36.7,y:136,regX:11.3,regY:8.8,scaleX:0.999,scaleY:0.999,rotation:3.5,startPosition:1}},{t:this.instance_4,p:{x:128.4,y:133.8,scaleX:0.999,scaleY:0.999,rotation:-12.8,startPosition:1,regY:9.5}}]},16).to({state:[{t:this.instance_5,p:{x:35.9,y:139.1,regX:11.3,regY:8.8,scaleX:0.999,scaleY:0.999,rotation:3.5,startPosition:1}},{t:this.instance_4,p:{x:129,y:136.9,scaleX:0.999,scaleY:0.999,rotation:-12.8,startPosition:1,regY:9.5}}]},1).to({state:[{t:this.instance_5,p:{x:36.7,y:144.6,regX:11.3,regY:8.8,scaleX:0.999,scaleY:0.999,rotation:3.5,startPosition:1}},{t:this.instance_4,p:{x:128.8,y:141.3,scaleX:0.997,scaleY:0.997,rotation:-15.1,startPosition:1,regY:9.4}}]},1).to({state:[{t:this.instance_5,p:{x:36.7,y:144.6,regX:11.3,regY:8.8,scaleX:0.999,scaleY:0.999,rotation:3.5,startPosition:1}},{t:this.instance_4,p:{x:128.8,y:141.3,scaleX:0.997,scaleY:0.997,rotation:-15.1,startPosition:1,regY:9.4}}]},1).to({state:[{t:this.instance_5,p:{x:37.3,y:141.4,regX:11.3,regY:8.8,scaleX:0.999,scaleY:0.999,rotation:3.5,startPosition:1}},{t:this.instance_4,p:{x:129.4,y:138.1,scaleX:0.997,scaleY:0.997,rotation:-15.1,startPosition:1,regY:9.4}}]},13).to({state:[{t:this.instance_5,p:{x:37.6,y:138.8,regX:11.3,regY:8.8,scaleX:0.999,scaleY:0.999,rotation:3.5,startPosition:1}},{t:this.instance_4,p:{x:129.7,y:135.5,scaleX:0.997,scaleY:0.997,rotation:-15.1,startPosition:1,regY:9.4}}]},1).to({state:[{t:this.instance_5,p:{x:38.3,y:135,regX:11.3,regY:8.8,scaleX:0.999,scaleY:0.999,rotation:3.5,startPosition:1}},{t:this.instance_4,p:{x:130.4,y:131.7,scaleX:0.997,scaleY:0.997,rotation:-15.1,startPosition:1,regY:9.4}}]},1).to({state:[{t:this.instance_5,p:{x:38.2,y:135.7,regX:11.3,regY:8.8,scaleX:0.999,scaleY:0.999,rotation:3.5,startPosition:1}},{t:this.instance_4,p:{x:130.4,y:132.4,scaleX:0.997,scaleY:0.997,rotation:-15.1,startPosition:1,regY:9.4}}]},2).to({state:[{t:this.instance_5,p:{x:38,y:136.2,regX:11.3,regY:8.8,scaleX:0.999,scaleY:0.999,rotation:3.5,startPosition:1}},{t:this.instance_4,p:{x:130.1,y:132.9,scaleX:0.997,scaleY:0.997,rotation:-15.1,startPosition:1,regY:9.4}}]},2).to({state:[{t:this.instance_5,p:{x:38,y:136.6,regX:11.3,regY:8.8,scaleX:0.999,scaleY:0.999,rotation:3.5,startPosition:1}},{t:this.instance_4,p:{x:130.1,y:133.3,scaleX:0.997,scaleY:0.997,rotation:-15.1,startPosition:1,regY:9.4}}]},2).to({state:[{t:this.instance_5,p:{x:38.6,y:139,regX:11.3,regY:8.8,scaleX:0.999,scaleY:0.999,rotation:3.5,startPosition:1}},{t:this.instance_4,p:{x:130.7,y:135.7,scaleX:0.997,scaleY:0.997,rotation:-15.1,startPosition:1,regY:9.4}}]},25).to({state:[{t:this.instance_5,p:{x:38.8,y:141.5,regX:11.3,regY:8.8,scaleX:0.999,scaleY:0.999,rotation:3.5,startPosition:1}},{t:this.instance_4,p:{x:130.9,y:138.2,scaleX:0.997,scaleY:0.997,rotation:-15.1,startPosition:1,regY:9.4}}]},1).to({state:[{t:this.instance_5,p:{x:39.1,y:145,regX:11.3,regY:8.8,scaleX:0.999,scaleY:0.999,rotation:3.5,startPosition:1}},{t:this.instance_4,p:{x:131.3,y:141.7,scaleX:0.997,scaleY:0.997,rotation:-15.1,startPosition:1,regY:9.4}}]},1).to({state:[{t:this.instance_5,p:{x:38.9,y:144.1,regX:11.3,regY:8.8,scaleX:0.999,scaleY:0.999,rotation:3.5,startPosition:1}},{t:this.instance_4,p:{x:131,y:140.8,scaleX:0.997,scaleY:0.997,rotation:-15.1,startPosition:1,regY:9.4}}]},2).to({state:[{t:this.instance_5,p:{x:38.9,y:143.5,regX:11.3,regY:8.8,scaleX:0.999,scaleY:0.999,rotation:3.5,startPosition:1}},{t:this.instance_4,p:{x:131,y:140.2,scaleX:0.997,scaleY:0.997,rotation:-15.1,startPosition:1,regY:9.4}}]},2).to({state:[]},17).wait(741));

	// glasses
	this.instance_6 = new lib.FIZ34_Skate1_EyeL("single",0);
	this.instance_6.setTransform(124.9,184.4,1,1,0,0,0,18,28.6);

	this.instance_7 = new lib.FIZ34_Skate1_EyeR("single",0);
	this.instance_7.setTransform(37,184.3,1,1,0,0,0,16.3,27.7);

	this.instance_8 = new lib.FIZ34_Skate1_GlassesArmL("single",0);
	this.instance_8.setTransform(152.2,187.2,1,1,0,0,0,13.7,5.7);

	this.instance_9 = new lib.FIZ34_Skate1_GlassesMid("single",0);
	this.instance_9.setTransform(79.3,179.4,1,1,0,0,0,32.1,6);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[]}).to({state:[{t:this.instance_9},{t:this.instance_8},{t:this.instance_7,p:{startPosition:0}},{t:this.instance_6,p:{startPosition:0}}]},92).to({state:[{t:this.instance_9},{t:this.instance_8},{t:this.instance_7,p:{startPosition:8}},{t:this.instance_6,p:{startPosition:10}}]},62).to({state:[{t:this.instance_9},{t:this.instance_8},{t:this.instance_7,p:{startPosition:4}},{t:this.instance_6,p:{startPosition:4}}]},1).to({state:[{t:this.instance_9},{t:this.instance_8},{t:this.instance_7,p:{startPosition:8}},{t:this.instance_6,p:{startPosition:10}}]},49).to({state:[{t:this.instance_9},{t:this.instance_8},{t:this.instance_7,p:{startPosition:0}},{t:this.instance_6,p:{startPosition:0}}]},1).to({state:[]},69).wait(741));

	// nose
	this.instance_10 = new lib.FIZ34_Skate1_Nose("single",0);
	this.instance_10.setTransform(59.9,184.5,1,1,0,0,0,17,1.6);
	this.instance_10._off = true;

	this.timeline.addTween(cjs.Tween.get(this.instance_10).wait(92).to({_off:false},0).to({_off:true},182).wait(741));

	// mouth
	this.instance_11 = new lib.FIZ34_Skate1_Mouth("single",0);
	this.instance_11.setTransform(94.6,237.9,1,1,0,0,0,32.4,12);
	this.instance_11._off = true;

	this.timeline.addTween(cjs.Tween.get(this.instance_11).wait(92).to({_off:false},0).wait(2).to({startPosition:2},0).wait(1).to({startPosition:3},0).wait(1).to({startPosition:4},0).wait(2).to({startPosition:3},0).wait(2).to({startPosition:2},0).wait(1).to({startPosition:3},0).wait(1).to({startPosition:4},0).wait(1).to({startPosition:19},0).wait(2).to({startPosition:18},0).wait(1).to({startPosition:2},0).wait(1).to({startPosition:3},0).wait(1).to({startPosition:4},0).wait(2).to({startPosition:3},0).wait(1).to({startPosition:2},0).wait(1).to({startPosition:18},0).wait(2).to({startPosition:19},0).wait(8).to({startPosition:2},0).wait(1).to({startPosition:3},0).wait(2).to({startPosition:4},0).wait(1).to({startPosition:3},0).wait(1).to({startPosition:11},0).wait(2).to({startPosition:18},0).wait(3).to({startPosition:19},0).wait(1).to({startPosition:3},0).wait(1).to({startPosition:4},0).wait(2).to({startPosition:6},0).wait(1).to({startPosition:7},0).wait(1).to({startPosition:2},0).wait(1).to({startPosition:3},0).wait(1).to({startPosition:2},0).wait(1).to({startPosition:18},0).wait(2).to({startPosition:19},0).wait(1).to({startPosition:8},0).wait(1).to({startPosition:7},0).wait(1).to({startPosition:2},0).wait(1).to({startPosition:3},0).wait(2).to({startPosition:4},0).wait(2).to({startPosition:3},0).wait(1).to({startPosition:2},0).wait(1).to({startPosition:18},0).wait(1).to({startPosition:19},0).wait(2).to({startPosition:11},0).wait(2).to({startPosition:8},0).wait(1).to({startPosition:7},0).wait(1).to({startPosition:17},0).wait(2).to({startPosition:3},0).wait(1).to({startPosition:4},0).wait(2).to({startPosition:2},0).wait(1).to({startPosition:18},0).wait(1).to({startPosition:19},0).wait(3).to({startPosition:18},0).wait(1).to({startPosition:2},0).wait(1).to({startPosition:8},0).wait(2).to({startPosition:7},0).wait(2).to({startPosition:4},0).wait(2).to({startPosition:3},0).wait(1).to({startPosition:1},0).wait(3).to({startPosition:8},0).wait(2).to({startPosition:7},0).wait(1).to({startPosition:6},0).wait(1).to({startPosition:4},0).wait(1).to({startPosition:13},0).wait(2).to({startPosition:7},0).wait(1).to({startPosition:8},0).wait(1).to({startPosition:7},0).wait(1).to({startPosition:2},0).wait(1).to({startPosition:19},0).wait(2).to({startPosition:18},0).wait(1).to({startPosition:7},0).wait(1).to({startPosition:8},0).wait(2).to({startPosition:2},0).wait(2).to({startPosition:3},0).wait(1).to({startPosition:4},0).wait(2).to({startPosition:18},0).wait(2).to({startPosition:2},0).wait(1).to({startPosition:3},0).wait(2).to({startPosition:2},0).wait(1).to({startPosition:4},0).wait(2).to({startPosition:3},0).wait(2).to({startPosition:18},0).wait(2).to({startPosition:3},0).wait(1).to({startPosition:4},0).wait(2).to({startPosition:3},0).wait(1).to({startPosition:18},0).wait(1).to({startPosition:7},0).wait(2).to({startPosition:8},0).wait(2).to({startPosition:2},0).wait(1).to({startPosition:3},0).wait(2).to({startPosition:4},0).wait(2).to({startPosition:13},0).wait(2).to({startPosition:12},0).wait(2).to({startPosition:16},0).wait(2).to({scaleX:1.01,scaleY:1.01,y:238.1,startPosition:1},0).wait(2).to({scaleX:1,scaleY:1,y:237.9},0).wait(9).to({startPosition:7},0).wait(2).to({startPosition:8},0).wait(1).to({startPosition:3},0).wait(1).to({startPosition:4},0).wait(1).to({startPosition:12},0).wait(2).to({startPosition:4},0).wait(2).to({startPosition:3},0).wait(3).to({startPosition:7},0).wait(1).to({startPosition:8},0).wait(2).to({startPosition:2},0).wait(1).to({startPosition:4},0).wait(2).to({startPosition:3},0).wait(2).to({startPosition:2},0).wait(2).to({startPosition:3},0).wait(2).to({startPosition:19},0).wait(1).to({startPosition:18},0).wait(1).to({startPosition:3},0).to({_off:true},1).wait(741));

	// head
	this.instance_12 = new lib.FIZ34_Skate1_EarL("single",0);
	this.instance_12.setTransform(156,195.5,1,1,0,0,0,3.1,23.4);

	this.instance_13 = new lib.FIZ34_Skate1_Hair("single",0);
	this.instance_13.setTransform(107.6,145.7,1,1,0,0,0,90.4,145.8);

	this.instance_14 = new lib.FIZ34_Skate1_Head("single",0);
	this.instance_14.setTransform(102.7,310.3,1,1,0,0,0,81.5,228.3);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[]}).to({state:[{t:this.instance_14},{t:this.instance_13},{t:this.instance_12}]},92).to({state:[]},182).wait(741));

	// helmetstrapL
	this.instance_15 = new lib.FIZ34_Skate1_HelmetStrapR_skatenormal("single",0);
	this.instance_15.setTransform(34.2,156,1,1,0.5,0,0,-2.1,-68.9);
	this.instance_15._off = true;

	this.timeline.addTween(cjs.Tween.get(this.instance_15).wait(92).to({_off:false},0).wait(32).to({regY:-68.8,rotation:-2.3,x:34.1,y:156.1},0).wait(2).to({regY:-68.9,scaleX:1,scaleY:1,rotation:-6.6,y:156},0).wait(2).to({regY:-68.8,rotation:-7.4},0).wait(2).to({rotation:-6},0).wait(2).to({regX:-2,rotation:-5.5,x:34.2,y:156.1},0).wait(25).to({regX:-2.1,regY:-68.9,scaleX:1,scaleY:1,rotation:-0.3,y:156},0).wait(2).to({scaleX:1,scaleY:1,rotation:2,y:156.1},0).wait(2).to({regX:-2.2,scaleX:1,scaleY:1,rotation:3.1,x:34.1},0).wait(2).to({regX:-2.1,scaleX:1,scaleY:1,rotation:3.6,y:156},0).wait(2).to({regY:-68.8,rotation:2.3},0).wait(2).to({rotation:1.7,y:156.1},0).wait(14).to({scaleX:1,scaleY:1,rotation:-2.3},0).wait(2).to({regY:-68.9,scaleX:1,scaleY:1,rotation:-6.6,y:156},0).wait(2).to({regY:-68.8,rotation:-7.4},0).wait(2).to({rotation:-6},0).wait(2).to({regX:-2,rotation:-5.5,x:34.2,y:156.1},0).wait(16).to({regX:-2.1,regY:-68.9,scaleX:1,scaleY:1,rotation:-0.3,y:156},0).wait(2).to({scaleX:1,scaleY:1,rotation:2,y:156.1},0).wait(2).to({regX:-2.2,scaleX:1,scaleY:1,rotation:3.1,x:34.1},0).wait(2).to({regX:-2.1,scaleX:1,scaleY:1,rotation:3.6,y:156},0).wait(2).to({regY:-68.8,rotation:2.3},0).wait(2).to({rotation:1.7,y:156.1},0).wait(37).to({rotation:-1.6,x:34.2,y:156},0).wait(2).to({rotation:-3.1,x:34.1,y:156.1},0).wait(2).to({rotation:-4},0).wait(2).to({regY:-68.7,rotation:-3.2},0).wait(2).to({rotation:-2.6,x:34.2},0).to({_off:true},14).wait(741));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(13.8,50.2,187,275.8);


(lib.test = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// FIZ34_Skate1_Apron
	this.instance = new lib.FIZ34_Skate1_Apron("single",71);
	this.instance.setTransform(244.7,536.9,1.274,1.274,0,0.4,-179.6,28.9,150.5);

	this.instance_1 = new lib.FIZ34_Skate1_Apron_flap("synched",11,false);
	this.instance_1.setTransform(265.6,372.7,1.27,1.271,0,-16.4,162.9,37.4,15.6);
	this.instance_1._off = true;

	this.timeline.addTween(cjs.Tween.get(this.instance).wait(1).to({regY:150.6,skewX:3,skewY:-177},0).wait(1).to({regY:150.5,scaleX:1.27,scaleY:1.27,skewX:4.3,skewY:-175.7,y:536.7},0).wait(1).to({regY:150.6,skewX:4.8,skewY:-175.2,y:536.8},0).wait(23).to({skewX:5.3,skewY:-174.7},0).wait(4).to({regX:28.8,skewX:4.4,skewY:-175.6},0).wait(1).to({regY:150.7,skewX:2.1,skewY:-177.9},0).wait(1).to({skewX:-1.2,skewY:-181.2,x:244.8},0).wait(1).to({regX:28.7,skewX:-2,skewY:-182},0).wait(1).to({regX:28.8,skewX:-2.5,skewY:-182.5},0).wait(28).to({regX:28.9,scaleX:1.27,scaleY:1.27,skewX:-0.3,skewY:-180.3},0).wait(1).to({regY:150.8,skewX:4.8,skewY:-175.2,x:244.7,y:536.9},0).to({_off:true},1).wait(24).to({_off:false},0).wait(1).to({regX:28.8,skewX:1.5,skewY:-178.5,x:244.8},0).wait(1).to({regX:28.9,skewX:-0.1,skewY:-180.1,x:244.7,y:536.8},0).wait(2).to({skewX:-0.6,skewY:-180.6,x:244.8},0).wait(2).to({scaleX:1.27,scaleY:1.27,skewX:-0.1,skewY:-180.1,y:536.7},0).wait(12).to({skewX:-0.8,skewY:-180.8,x:244.7},0).wait(2).to({skewX:-1.6,skewY:-181.6,x:244.8},0).wait(2).to({skewX:-2.2,skewY:-182.2,x:244.7,y:536.8},0).wait(1).to({regY:150.9,skewX:5.4,skewY:-174.6,x:244.8,y:537.6},0).wait(1).to({regX:29,scaleX:1.27,scaleY:1.27,skewX:13,skewY:-167,y:538.2},0).wait(1).to({regX:28.9,regY:151,skewX:16.2,skewY:-163.8,x:245,y:540.7},0).wait(4).to({regX:28.8,skewX:14.8,skewY:-165.2,x:244.8,y:540.6},0).wait(2).to({regX:28.9,regY:150.9,skewX:14,skewY:-166,x:244.9},0).wait(7).to({scaleX:1.28,scaleY:1.28,skewX:14.5,skewY:-165.5,x:244.6,y:543.1},0).wait(1).to({regX:28.8,regY:150.8,scaleX:1.3,scaleY:1.3,skewX:14.8,skewY:-165.2,x:244.3,y:546.6},0).wait(1).to({regX:28.9,regY:151.1,scaleX:1.35,scaleY:1.35,skewX:15.6,skewY:-164.4,x:242.9,y:556},0).wait(4).to({regY:151,scaleX:1.33,scaleY:1.33,x:243.4,y:551.7},0).wait(25).to({regY:150.9,scaleX:1.32,scaleY:1.32,skewX:16.9,skewY:-163.1,x:243.7,y:550.3},0).wait(2).to({regY:151.1,scaleX:1.31,scaleY:1.31,skewX:11,skewY:-169,x:243.9,y:548},0).wait(1).to({regY:151,scaleX:1.29,scaleY:1.29,skewX:5.7,skewY:-174.3,x:244.1,y:545.4},0).wait(1).to({regY:150.9,scaleX:1.27,scaleY:1.27,skewX:-0.5,skewY:-180.5,x:246,y:540.4},0).wait(2).to({regX:28.8,regY:151,skewX:0.4,skewY:-179.6,y:540.5},0).wait(2).to({regX:28.9,regY:150.9,skewX:1.2,skewY:-178.8,x:245.9},0).wait(17));
	this.timeline.addTween(cjs.Tween.get(this.instance_1).wait(64).to({_off:false},0).wait(1).to({regY:15.5,scaleY:1.27,skewX:-13.7,skewY:165.7,x:273.2,y:377.9},0).wait(1).to({regY:15.6,skewX:-12.1,skewY:167.2,x:277.5,y:380},0).wait(1).to({skewX:-11.6,skewY:167.8,x:279.1,y:382.7},0).wait(2).to({skewX:-11,skewY:168.3,x:280.6,y:385.3},0).wait(4).to({skewX:-11.3,skewY:168,x:279.8,y:382.8},0).wait(12).to({regX:37.3,skewX:-10.5,skewY:168.9,x:282,y:383.2},0).wait(1).to({regY:15.5,skewX:-13.5,skewY:165.8,x:273.9,y:379.6},0).wait(1).to({regY:15.6,scaleX:1.27,skewX:-17.1,skewY:162.3,x:264.2,y:372.5},0).to({_off:true},1).wait(94));

	// 레이어 2
	this.instance_2 = new lib.FIZ34_Skate1_ArmL("single",6);
	this.instance_2.setTransform(204.2,370.6,1.273,1.273,0,-5.3,174.7,2.9,4);

	this.instance_3 = new lib.FIZ34_Skate1_Torso("single",0);
	this.instance_3.setTransform(237.6,493.3,1.274,1.274,0,0.5,-179.5,34.6,9.3);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.instance_3},{t:this.instance_2}]}).to({state:[{t:this.instance_2}]},1).to({state:[{t:this.instance_2}]},1).to({state:[{t:this.instance_2}]},1).to({state:[{t:this.instance_2}]},2).to({state:[{t:this.instance_2}]},23).to({state:[{t:this.instance_2}]},2).to({state:[{t:this.instance_2}]},1).to({state:[{t:this.instance_2}]},1).to({state:[{t:this.instance_2}]},1).to({state:[{t:this.instance_2}]},1).to({state:[{t:this.instance_2}]},4).to({state:[{t:this.instance_2}]},24).to({state:[{t:this.instance_2}]},1).to({state:[{t:this.instance_2}]},1).to({state:[{t:this.instance_2}]},1).to({state:[{t:this.instance_2}]},1).to({state:[{t:this.instance_2}]},1).to({state:[{t:this.instance_2}]},2).to({state:[{t:this.instance_2}]},4).to({state:[{t:this.instance_2}]},10).to({state:[{t:this.instance_2}]},2).to({state:[{t:this.instance_2}]},1).to({state:[{t:this.instance_2}]},1).to({state:[{t:this.instance_2}]},1).to({state:[{t:this.instance_2}]},1).to({state:[{t:this.instance_2}]},1).to({state:[{t:this.instance_2}]},16).to({state:[{t:this.instance_2}]},2).to({state:[{t:this.instance_2}]},2).to({state:[{t:this.instance_2}]},1).to({state:[{t:this.instance_2}]},1).to({state:[{t:this.instance_2}]},1).to({state:[{t:this.instance_2}]},2).to({state:[{t:this.instance_2}]},2).to({state:[{t:this.instance_2}]},2).to({state:[{t:this.instance_2}]},5).to({state:[{t:this.instance_2}]},2).to({state:[{t:this.instance_2}]},1).to({state:[{t:this.instance_2}]},1).to({state:[{t:this.instance_2}]},2).to({state:[{t:this.instance_2}]},2).to({state:[{t:this.instance_2}]},23).to({state:[{t:this.instance_2}]},2).to({state:[{t:this.instance_2}]},2).to({state:[{t:this.instance_2}]},1).to({state:[{t:this.instance_2}]},1).to({state:[{t:this.instance_2}]},2).to({state:[{t:this.instance_2}]},2).wait(17));
	this.timeline.addTween(cjs.Tween.get(this.instance_2).wait(1).to({regX:1.9,regY:4.9,scaleX:1.27,scaleY:1.27,skewX:-31.1,skewY:148.9,x:214.1,y:364.7,startPosition:8},0).wait(1).to({skewX:-29.9,skewY:150.1,x:217.9,y:364,startPosition:9},0).wait(1).to({regX:2,scaleX:1.3,skewX:-29.3,skewY:150.7,x:218.3,y:365,startPosition:7},0).wait(2).to({regX:1.9,scaleX:1.28,skewX:-29.1,skewY:150.9,x:220.2,y:363.7},0).wait(23).to({regX:2,scaleX:1.27,skewX:-26.9,skewY:153.1,x:222,y:363.4},0).wait(2).to({skewX:-28.2,skewY:151.8,x:218,y:364.1},0).wait(1).to({regY:4.8,scaleX:1.27,scaleY:1.27,skewX:-34.5,skewY:145.5,x:211.1,y:365.2},0).wait(1).to({regY:4.9,scaleX:1.27,scaleY:1.28,skewX:-23.7,skewY:148.7,x:201.4,y:367.6,startPosition:11},0).wait(1).to({scaleY:1.27,skewX:-26.8,skewY:153.2,x:201,y:368.4,startPosition:10},0).wait(1).to({regY:4.8,scaleX:1.27,scaleY:1.27,skewX:-17.6,skewY:162.4,x:197.5,startPosition:1},0).wait(4).to({skewX:-15.5,skewY:164.5,x:197.6},0).wait(24).to({regY:4.9,skewX:-11,skewY:169,x:204.2,y:366.7},0).wait(1).to({scaleX:1.27,scaleY:1.27,skewX:-6,skewY:174,x:219.3,y:363.8},0).wait(1).to({regX:-19.3,regY:27.1,scaleX:1.26,scaleY:1.26,skewX:-3.7,skewY:176.3,x:244.2,y:372.7,startPosition:13},0).wait(1).to({regX:-22.8,regY:27.5,scaleX:1.26,scaleY:1.26,skewX:4.2,skewY:184.2,x:255.1,y:378.8,startPosition:14},0).wait(1).to({regX:-21.4,regY:27,scaleX:1.26,scaleY:1.26,skewX:8.4,skewY:188.4,x:257.2,y:379.9},0).wait(1).to({regX:-21.1,regY:27.6,skewX:12.4,skewY:192.4,x:257.3,y:383.7},0).wait(2).to({regX:2,regY:5,skewX:13.4,skewY:193.4,x:236.5,y:351.8},0).wait(4).to({regX:-20,regY:24.4,skewX:11.1,skewY:191.1,x:258.1,y:379},0).wait(10).to({skewX:12.4,skewY:192.4,x:258.9},0).wait(2).to({regX:-19.9,skewX:12.9,skewY:192.9,x:260.2},0).wait(1).to({scaleX:1.26,scaleY:1.26,skewX:9.9,skewY:189.9,x:252,y:376.7},0).wait(1).to({regX:-19.8,regY:24.3,scaleX:1.26,scaleY:1.26,skewX:-4,skewY:176,x:242.1,y:370.7,startPosition:37},0).wait(1).to({regX:2,regY:4.9,scaleX:1.27,scaleY:1.27,skewX:-12.1,skewY:167.9,x:219.2,y:363.9,startPosition:15},0).wait(1).to({regY:4.8,skewX:-8.5,skewY:171.5,x:209.2,y:365.6},0).wait(1).to({regX:1.9,skewX:-5.8,skewY:174.2,x:204.7,y:366.5},0).wait(16).to({regX:1.8,scaleX:1.26,scaleY:1.26,skewX:-6,skewY:174,x:202.6,y:366.9},0).wait(2).to({regX:1.9,skewX:-5.6,skewY:174.4,x:200.1,y:367.6},0).wait(2).to({regY:4.9,skewX:-7.7,skewY:172.3,x:198.5,y:368.2},0).wait(1).to({regX:2,regY:4.8,skewX:-0.1,skewY:179.9,x:221,y:364.3,startPosition:16},0).wait(1).to({scaleX:1.26,scaleY:1.26,skewX:7.5,skewY:187.5,x:244.2,y:363.3,startPosition:17},0).wait(1).to({regX:1.9,regY:4.9,skewX:6.9,skewY:185.7,x:254.2,y:366.2,startPosition:18},0).wait(2).to({skewX:8.4,skewY:188.4,x:252.6,y:366.1},0).wait(2).to({regX:1.8,skewX:8.8,skewY:188.8,x:249.9,y:365.9},0).wait(2).to({regX:1.9,regY:4.8,skewX:8.5,skewY:188.5,x:247.7},0).wait(5).to({scaleX:1.25,scaleY:1.25,x:248,y:365.3},0).wait(2).to({regX:1.8,regY:4.9,scaleX:1.28,scaleY:1.28,skewX:9,skewY:189,x:248.9,y:366.8,startPosition:20},0).wait(1).to({regX:1.9,regY:4.8,scaleX:1.3,scaleY:1.3,skewX:9.3,skewY:189.3,x:249.4,y:367.6,startPosition:21},0).wait(1).to({regY:4.7,scaleX:1.37,scaleY:1.37,skewX:8,skewY:188,x:250.3,y:369.5,startPosition:22},0).wait(2).to({regX:1.8,scaleX:1.35,scaleY:1.35,skewX:8.8,skewY:188.8,x:250.7,y:368.7},0).wait(2).to({regX:1.9,regY:4.8,scaleX:1.33,scaleY:1.33,skewX:9.6,skewY:189.6,x:251,y:368.8},0).wait(23).to({scaleX:1.31,scaleY:1.31,skewX:10.8,skewY:190.8,x:252.2,y:368.9},0).wait(2).to({regY:4.9,skewX:12.7,skewY:192.7,x:255.6,y:369.2},0).wait(2).to({scaleX:1.29,scaleY:1.29,skewX:5.5,skewY:185.5,x:237.5,y:368.5,startPosition:23},0).wait(1).to({regY:4.8,scaleX:1.26,scaleY:1.26,skewX:0.2,skewY:180.2,x:222,y:369.2,startPosition:24},0).wait(1).to({regX:1.8,regY:4.9,scaleY:1.26,skewX:-13,skewY:167.4,x:204.9,y:370.8,startPosition:1},0).wait(2).to({regX:1.9,scaleY:1.26,skewX:-10.7,skewY:169.3,x:207.6,y:370.2},0).wait(2).to({regY:5,scaleX:1.26,scaleY:1.26,skewX:-8.9,skewY:171.1,x:209.8,y:369.8},0).wait(17));

	// FIZ34_Skate1_Torso
	this.instance_4 = new lib.FIZ34_Skate1_Body("single",0);
	this.instance_4.setTransform(239.4,497.8,1.274,1.274,0,0.4,-179.6,33.3,119.8);

	this.instance_5 = new lib.FIZ34_Skate1_Torso("single",0);
	this.instance_5.setTransform(239.7,492.8,1.274,1.274,0,3,-177,34.6,9.2);
	this.instance_5._off = true;

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.instance_4}]}).to({state:[{t:this.instance_5}]},1).to({state:[{t:this.instance_5}]},1).to({state:[{t:this.instance_5}]},1).to({state:[{t:this.instance_5}]},2).to({state:[{t:this.instance_5}]},23).to({state:[{t:this.instance_5}]},2).to({state:[{t:this.instance_5}]},1).to({state:[{t:this.instance_5}]},1).to({state:[{t:this.instance_5}]},1).to({state:[{t:this.instance_5}]},1).to({state:[{t:this.instance_5}]},4).to({state:[{t:this.instance_5}]},24).to({state:[{t:this.instance_5}]},1).to({state:[]},1).to({state:[{t:this.instance_5}]},24).to({state:[{t:this.instance_5}]},1).to({state:[{t:this.instance_5}]},1).to({state:[{t:this.instance_5}]},16).to({state:[{t:this.instance_5}]},2).to({state:[{t:this.instance_5}]},2).to({state:[{t:this.instance_5}]},1).to({state:[{t:this.instance_5}]},1).to({state:[{t:this.instance_5}]},1).to({state:[{t:this.instance_5}]},2).to({state:[{t:this.instance_5}]},2).to({state:[{t:this.instance_5}]},2).to({state:[{t:this.instance_5}]},5).to({state:[{t:this.instance_5}]},2).to({state:[{t:this.instance_5}]},1).to({state:[{t:this.instance_5}]},1).to({state:[{t:this.instance_5}]},2).to({state:[{t:this.instance_5}]},2).to({state:[{t:this.instance_5}]},23).to({state:[{t:this.instance_5}]},2).to({state:[{t:this.instance_5}]},2).to({state:[{t:this.instance_5}]},1).to({state:[{t:this.instance_5}]},1).to({state:[{t:this.instance_5}]},2).to({state:[{t:this.instance_5}]},2).wait(17));
	this.timeline.addTween(cjs.Tween.get(this.instance_5).wait(1).to({_off:false},0).wait(1).to({regX:34.7,skewX:4.3,skewY:-175.7,x:240.5,y:492.7},0).wait(1).to({skewX:4.8,skewY:-175.2,x:240.9},0).wait(2).to({regX:34.6,regY:9.1,scaleX:1.27,scaleY:1.27,skewX:5.1,skewY:-174.9,x:241.3,y:492.5},0).wait(23).to({skewX:5.7,skewY:-174.3,x:241.7,y:492.4},0).wait(2).to({skewX:4.4,skewY:-175.6,x:240.7},0).wait(1).to({skewX:2.1,skewY:-177.9,x:238.9,y:492.7},0).wait(1).to({skewX:-1.2,skewY:-181.2,x:236.5,y:493.1},0).wait(1).to({skewX:-2,skewY:-182,x:235.9,y:493.3},0).wait(1).to({regY:9,skewX:-2.5,skewY:-182.5,x:235.5},0).wait(4).to({regY:9.1,y:493.4},0).wait(24).to({scaleX:1.27,scaleY:1.27,skewX:-0.2,skewY:-180.2,x:237.3,y:493},0).wait(1).to({regY:9.2,skewX:4.8,skewY:-175.2,x:241.1,y:492.6},0).to({_off:true},1).wait(24).to({_off:false},0).wait(1).to({regY:9.1,skewX:1.5,skewY:-178.5,x:238.5,y:492.8},0).wait(1).to({regX:34.5,skewX:0,skewY:-180,x:237.5,y:492.9},0).wait(16).to({regX:34.6,regY:8.9,scaleX:1.27,scaleY:1.27,skewX:-0.8,skewY:-180.8,x:237,y:492.8},0).wait(2).to({regY:9,skewX:-1.6,skewY:-181.6,x:236.3,y:493},0).wait(2).to({regY:9.1,skewX:-2.1,skewY:-182.1,x:235.9,y:493.3},0).wait(1).to({regY:9,skewX:5.4,skewY:-174.6,x:241.7,y:493},0).wait(1).to({regY:9.1,skewX:13,skewY:-167,x:247.6,y:493.8},0).wait(1).to({scaleX:1.27,scaleY:1.27,skewX:16.2,skewY:-163.8,x:250.2,y:496.5},0).wait(2).to({skewX:15.7,skewY:-164.3,x:249.7},0).wait(2).to({regY:9.2,skewX:14.9,skewY:-165.1,x:248.9,y:496.4},0).wait(2).to({regY:9.1,scaleX:1.27,scaleY:1.27,skewX:14.1,skewY:-165.9,x:248.5},0).wait(5).to({regX:34.7,scaleX:1.26,scaleY:1.26,x:248.7,y:494.5},0).wait(2).to({scaleX:1.28,scaleY:1.28,skewX:14.5,skewY:-165.5,x:248.6,y:498.5},0).wait(1).to({regX:34.6,scaleX:1.3,scaleY:1.3,skewX:14.8,skewY:-165.2,x:248.4,y:501.5},0).wait(1).to({regX:34.7,scaleX:1.35,scaleY:1.35,skewX:15.6,skewY:-164.4,x:247.9,y:509},0).wait(2).to({regY:9.2,scaleX:1.33,scaleY:1.33,x:248.1,y:506.6},0).wait(2).to({regX:34.6,scaleX:1.33,scaleY:1.33,x:248.3,y:505.6},0).wait(23).to({regX:34.7,scaleX:1.32,scaleY:1.32,skewX:15.8,skewY:-164.2,x:248.7,y:504.6},0).wait(2).to({skewX:16.9,skewY:-163.1,x:249.5},0).wait(2).to({scaleX:1.31,scaleY:1.31,skewX:11,skewY:-169,x:245.2,y:502.2},0).wait(1).to({regX:34.8,scaleX:1.29,scaleY:1.29,skewX:5.8,skewY:-174.2,x:241.1,y:500.4},0).wait(1).to({regX:34.7,regY:9,scaleX:1.27,scaleY:1.27,skewX:-0.5,skewY:-180.5,x:238.2,y:496.6},0).wait(2).to({regX:34.8,regY:9.1,skewX:0.4,skewY:-179.6,x:238.8,y:496.7},0).wait(2).to({regX:34.7,skewX:1.2,skewY:-178.8,x:239.5},0).wait(17));

	// FIZ34_Skate1_LegL
	this.instance_6 = new lib.FIZ34_Skate1_Body("single",0);
	this.instance_6.setTransform(241.2,497.5,1.274,1.274,0,3,-177,33.3,119.9);
	this.instance_6._off = true;

	this.timeline.addTween(cjs.Tween.get(this.instance_6).wait(1).to({_off:false},0).wait(1).to({regX:33.4,regY:119.8,scaleX:1.27,scaleY:1.27,skewX:4.3,skewY:-175.7,x:242,y:497.3},0).wait(1).to({skewX:4.8,skewY:-175.2,x:242.3},0).wait(23).to({skewX:5.3,skewY:-174.7,x:242.6,y:497.2},0).wait(4).to({skewX:4.4,skewY:-175.6,x:241.9},0).wait(1).to({skewX:2.1,skewY:-177.9,x:240.3,y:497.3},0).wait(1).to({regY:119.9,skewX:-1.2,skewY:-181.2,x:238.1,y:497.7},0).wait(1).to({regY:119.8,skewX:-2,skewY:-182,x:237.4},0).wait(1).to({regY:119.9,skewX:-2.5,skewY:-182.5,x:237.2,y:497.9},0).wait(28).to({regX:33.5,scaleX:1.27,scaleY:1.27,skewX:-0.3,skewY:-180.3,x:238.7,y:497.7},0).wait(1).to({skewX:4.8,skewY:-175.2,x:242.2,y:497.3},0).to({_off:true},1).wait(24).to({_off:false},0).wait(1).to({regY:120,skewX:1.5,skewY:-178.5,x:239.8,y:497.6},0).wait(1).to({regX:33.4,skewX:-0.1,skewY:-180.1,x:239,y:497.7},0).wait(2).to({regX:33.5,skewX:-0.6,skewY:-180.6,x:238.5},0).wait(2).to({regX:33.4,scaleX:1.27,scaleY:1.27,skewX:-0.1,skewY:-180.1,x:239.1,y:497.5},0).wait(12).to({regX:33.3,skewX:-0.8,skewY:-180.8,x:238.6,y:497.6},0).wait(2).to({regX:33.4,skewX:-1.6,skewY:-181.6,x:237.9,y:497.8},0).wait(2).to({regX:33.3,regY:119.9,skewX:-2.2,skewY:-182.2,x:237.6,y:497.7},0).wait(1).to({regX:33.4,regY:120,skewX:5.4,skewY:-174.6,x:242.8,y:498},0).wait(1).to({regX:33.5,regY:120.1,scaleX:1.27,scaleY:1.27,skewX:13,skewY:-167,x:248,y:498.8},0).wait(1).to({regX:33.4,regY:120,skewX:16.2,skewY:-163.8,x:250.4,y:501.3},0).wait(4).to({regY:120.1,skewX:14.8,skewY:-165.2,x:249.2,y:501.2},0).wait(2).to({regY:120,skewX:14,skewY:-166,x:248.9},0).wait(7).to({regY:120.1,scaleX:1.28,scaleY:1.28,skewX:14.5,skewY:-165.5,y:503.4},0).wait(1).to({regY:120,scaleX:1.3,scaleY:1.3,skewX:14.8,skewY:-165.2,x:248.7,y:506.3},0).wait(1).to({scaleX:1.35,scaleY:1.35,skewX:15.6,skewY:-164.4,x:248.3,y:513.9},0).wait(4).to({scaleX:1.33,scaleY:1.33,x:248.7,y:510.4},0).wait(25).to({scaleX:1.32,scaleY:1.32,skewX:16.9,skewY:-163.1,x:249.9,y:509.6},0).wait(2).to({regY:119.9,scaleX:1.31,scaleY:1.31,skewX:11,skewY:-169,x:245.9,y:506.9},0).wait(1).to({regY:120,scaleX:1.29,scaleY:1.29,skewX:5.7,skewY:-174.3,x:242.3,y:504.9},0).wait(1).to({regX:33.5,scaleX:1.27,scaleY:1.27,skewX:-0.5,skewY:-180.5,x:239.8,y:501.3},0).wait(2).to({regX:33.4,skewX:0.4,skewY:-179.6,x:240.4,y:501.2},0).wait(2).to({skewX:1.2,skewY:-178.8,x:241},0).wait(17));

	// FIZ34_Skate1_Body
	this.instance_7 = new lib.FIZ34_Skate1_ApronTieBK("synched",0);
	this.instance_7.setTransform(211.8,494.2,1.27,1.29,0,9.6,-170.4,-3.1,18);

	this.instance_8 = new lib.FIZ34_Skate1_Body("single",35);
	this.instance_8.setTransform(265.4,372.9,1.27,1.27,0,-17.1,162.9,37.5,15.7);

	this.instance_9 = new lib.FIZ_34_tieloop("synched",2,false);
	this.instance_9.setTransform(211.7,490.3,1.271,1.271,0,-0.1,179.9,-3.1,18.3);

	this.timeline.addTween(cjs.Tween.get({}).to({state:[{t:this.instance_7}]}).to({state:[{t:this.instance_7}]},1).to({state:[{t:this.instance_7}]},1).to({state:[{t:this.instance_7}]},3).to({state:[{t:this.instance_7}]},26).to({state:[{t:this.instance_7}]},1).to({state:[{t:this.instance_7}]},1).to({state:[{t:this.instance_7}]},3).to({state:[{t:this.instance_7}]},26).to({state:[{t:this.instance_7}]},1).to({state:[{t:this.instance_9,p:{regX:-3.1,regY:18.3,skewX:-0.1,skewY:179.9,x:211.7,y:490.3,scaleX:1.271,scaleY:1.271}},{t:this.instance_8,p:{regY:15.7,skewX:-17.1,skewY:162.9,x:265.4,y:372.9,regX:37.5,scaleX:1.27,scaleY:1.27}}]},1).to({state:[{t:this.instance_9,p:{regX:-3.2,regY:18.4,skewX:2.7,skewY:-177.3,x:213.8,y:492.9,scaleX:1.271,scaleY:1.271}},{t:this.instance_8,p:{regY:15.6,skewX:-14.3,skewY:165.7,x:273.1,y:378,regX:37.5,scaleX:1.27,scaleY:1.27}}]},1).to({state:[{t:this.instance_9,p:{regX:-3.1,regY:18.4,skewX:4.2,skewY:-175.8,x:214.9,y:493.2,scaleX:1.271,scaleY:1.271}},{t:this.instance_8,p:{regY:15.6,skewX:-12.8,skewY:167.2,x:277.5,y:380,regX:37.4,scaleX:1.27,scaleY:1.27}}]},1).to({state:[{t:this.instance_9,p:{regX:-3.3,regY:18.4,skewX:4.8,skewY:-175.2,x:215.6,y:495.4,scaleX:1.271,scaleY:1.271}},{t:this.instance_8,p:{regY:15.7,skewX:-12.2,skewY:167.8,x:278.9,y:382.8,regX:37.5,scaleX:1.27,scaleY:1.27}}]},1).to({state:[{t:this.instance_9,p:{regX:-3.3,regY:18.4,skewX:5.3,skewY:-174.7,x:216,y:497.4,scaleX:1.271,scaleY:1.271}},{t:this.instance_8,p:{regY:15.7,skewX:-11.7,skewY:168.3,x:280.6,y:385.3,regX:37.4,scaleX:1.27,scaleY:1.27}}]},2).to({state:[{t:this.instance_9,p:{regX:-3.3,regY:18.3,skewX:5,skewY:-175,x:215.8,y:495,scaleX:1.271,scaleY:1.271}},{t:this.instance_8,p:{regY:15.7,skewX:-12,skewY:168,x:279.6,y:382.8,regX:37.5,scaleX:1.27,scaleY:1.27}}]},4).to({state:[{t:this.instance_9,p:{regX:-3.2,regY:18.4,skewX:5.9,skewY:-174.1,x:216.2,y:494.6,scaleX:1.271,scaleY:1.271}},{t:this.instance_8,p:{regY:15.7,skewX:-11.1,skewY:168.9,x:281.9,y:383.2,regX:37.4,scaleX:1.27,scaleY:1.27}}]},12).to({state:[{t:this.instance_9,p:{regX:-3.3,regY:18.4,skewX:2.8,skewY:-177.2,x:214.2,y:494.3,scaleX:1.27,scaleY:1.27}},{t:this.instance_8,p:{regY:15.6,skewX:-14.2,skewY:165.8,x:273.8,y:379.6,regX:37.4,scaleX:1.27,scaleY:1.27}}]},1).to({state:[{t:this.instance_9,p:{regX:-3.2,regY:18.4,skewX:-0.7,skewY:179.3,x:211.6,y:490.6,scaleX:1.27,scaleY:1.27}},{t:this.instance_8,p:{regY:15.8,skewX:-17.7,skewY:162.3,x:264.1,y:372.6,regX:37.3,scaleX:1.269,scaleY:1.269}}]},1).to({state:[{t:this.instance_7}]},1).to({state:[{t:this.instance_7}]},1).to({state:[{t:this.instance_7}]},1).to({state:[{t:this.instance_7}]},16).to({state:[{t:this.instance_7}]},2).to({state:[{t:this.instance_7}]},3).to({state:[{t:this.instance_7}]},1).to({state:[{t:this.instance_7}]},1).to({state:[{t:this.instance_7}]},4).to({state:[{t:this.instance_7}]},7).to({state:[{t:this.instance_7}]},2).to({state:[{t:this.instance_7}]},1).to({state:[{t:this.instance_7}]},1).to({state:[{t:this.instance_7}]},2).to({state:[{t:this.instance_7}]},4).to({state:[{t:this.instance_7}]},23).to({state:[{t:this.instance_7}]},2).to({state:[{t:this.instance_7}]},1).to({state:[{t:this.instance_7}]},1).to({state:[{t:this.instance_7}]},2).to({state:[{t:this.instance_7}]},2).wait(17));
	this.timeline.addTween(cjs.Tween.get(this.instance_7).wait(1).to({regY:17.9,scaleX:1.27,skewX:12.1,skewY:-167.9,x:213.7,y:492.7},0).wait(1).to({skewX:13.4,skewY:-166.6,x:214.7,y:491.9},0).wait(3).to({skewX:14.2,skewY:-165.8,x:215.3,y:491.5},0).wait(26).to({scaleY:1.29,skewX:11.2,skewY:-168.8,x:213,y:493.1},0).wait(1).to({skewX:7.9,skewY:-172.1,x:210.5,y:495.1},0).wait(1).to({skewX:7.1,skewY:-172.9,x:210,y:495.6},0).wait(3).to({regX:-3,skewX:6.3,skewY:-173.7,x:209.3,y:496.1},0).wait(26).to({regX:-3.1,regY:18,scaleX:1.27,skewX:8.9,skewY:-171.1,x:211.2,y:494.6},0).wait(1).to({regY:17.9,scaleY:1.29,skewX:13.9,skewY:-166.1,x:215.1,y:491.8},0).to({_off:true},1).wait(24).to({_off:false},0).wait(1).to({skewX:10.6,skewY:-169.4,x:212.4,y:493.5},0).wait(1).to({skewX:9.1,skewY:-170.9,x:211.3,y:494.3},0).wait(16).to({regX:-3,regY:17.8,scaleX:1.27,skewX:8.3,skewY:-171.7,x:210.8,y:494.6},0).wait(2).to({regX:-3.1,skewX:7.5,skewY:-172.5,x:210.3,y:495.1},0).wait(3).to({scaleY:1.29,skewX:14.5,skewY:-165.5,x:215.6,y:492.1},0).wait(1).to({regY:17.9,scaleX:1.27,skewX:22.1,skewY:-157.8,x:221.9,y:489.5},0).wait(1).to({regX:-3,scaleY:1.29,skewX:24.8,skewY:-155.2,x:224.2,y:490.8},0).wait(4).to({scaleY:1.29,skewX:23.4,skewY:-156.6,x:223,y:491.3},0).wait(7).to({regX:-3.1,scaleX:1.25,scaleY:1.27,skewX:23.2,skewY:-156.8,x:223.4,y:489.5},0).wait(2).to({scaleX:1.28,scaleY:1.3,skewX:23.7,skewY:-156.3,x:222.8,y:493.2},0).wait(1).to({regX:-3,scaleX:1.3,scaleY:1.32,skewX:24,skewY:-156,x:222.2,y:496},0).wait(1).to({scaleX:1.35,scaleY:1.37,skewX:24.7,skewY:-155.3,x:220.7,y:502.9},0).wait(2).to({scaleX:1.33,scaleY:1.35,x:221.4,y:500.4},0).wait(4).to({regX:-3.1,scaleX:1.32,scaleY:1.34,x:222.1,y:498.5},0).wait(23).to({regX:-3,regY:17.8,skewX:26,skewY:-154,x:223.3,y:498},0).wait(2).to({regY:17.9,scaleX:1.3,scaleY:1.32,skewX:20.1,skewY:-159.9,x:218.5,y:498.4},0).wait(1).to({scaleX:1.29,scaleY:1.31,skewX:14.9,skewY:-165.1,x:214.6,y:498.9},0).wait(1).to({regX:-3.1,regY:17.8,scaleX:1.26,scaleY:1.29,skewX:8.7,skewY:-171.3,x:212.4,y:498.2},0).wait(2).to({regY:17.9,skewX:9.6,skewY:-170.4,x:213,y:497.9},0).wait(2).to({regY:17.8,scaleY:1.29,skewX:10.3,skewY:-169.7,x:213.5,y:497.4},0).wait(17));

	// FIZ34_Skate1_LegR
	this.instance_10 = new lib.FIZ34_Skate1_ArmR("single",8);
	this.instance_10.setTransform(267.3,373.8,1.273,1.273,0,13,-167,78.3,7.6);

	this.timeline.addTween(cjs.Tween.get(this.instance_10).wait(1).to({regX:78.4,regY:7.5,skewX:15.5,skewY:-164.5,x:274.5,y:374.7,startPosition:9},0).wait(1).to({regX:87,regY:-3.1,scaleX:1.27,scaleY:1.27,skewX:13.2,skewY:-166.8,x:271.6,y:359.3,startPosition:19},0).wait(1).to({regY:-3,scaleY:1.3,skewX:12.9,skewY:-167.1,x:273.1,y:359.7,startPosition:20},0).wait(4).to({regY:-3.1,scaleX:1.27,scaleY:1.27,skewX:21.7,skewY:-158.3,x:273.9,startPosition:21},0).wait(2).to({skewX:23.2,skewY:-156.8,startPosition:22},0).wait(3).to({skewX:15.9,skewY:-164.1,startPosition:19},0).wait(2).to({skewX:13.9,skewY:-166.1,x:274,y:359.8,startPosition:20},0).wait(2).to({skewX:14.4,skewY:-165.6,x:273.9,y:359.7,startPosition:19},0).wait(10).to({scaleX:1.27,scaleY:1.27,skewX:15.6,skewY:-164.4,x:274.8,y:359.9},0).wait(2).to({regY:-3.2,skewX:17,skewY:-163,x:275.8},0).wait(2).to({regY:-3.3,skewX:19.5,skewY:-160.5,x:271.9,y:359.3},0).wait(1).to({regX:87.1,skewX:17.2,skewY:-162.8,x:264.7,y:358.3},0).wait(1).to({regY:-3.4,scaleX:1.27,scaleY:1.27,skewX:22.4,skewY:-157.6,x:250.6,y:358.8,startPosition:57},0).wait(1).to({regX:87.2,skewX:13.1,skewY:-166.9,x:252,y:357.4,startPosition:58},0).wait(1).to({regX:87,scaleY:1.27,skewX:10.7,skewY:-167.4,x:250.5,startPosition:59},0).wait(2).to({regX:87.1,regY:-3.3,scaleY:1.27,skewX:12,skewY:-167.7,x:249.3,startPosition:60},0).wait(2).to({skewX:12.6,skewY:-167.4,x:250.4,y:357.5,startPosition:61},0).wait(20).to({regY:-3.4,skewX:12.4,skewY:-167.6,x:249.6,startPosition:60},0).wait(2).to({regX:87,skewX:11.3,skewY:-168.7,x:248.9},0).wait(2).to({regY:-3.5,skewX:14.1,skewY:-165.9,x:257.5,y:357.8},0).wait(1).to({skewX:19.1,skewY:-160.9,x:273.1,y:359.6},0).wait(1).to({scaleX:1.27,scaleY:1.27,skewX:37.3,skewY:-142.7,x:295.5,y:374.2,startPosition:12},0).wait(1).to({regX:86.8,regY:-3.6,skewX:33.7,skewY:-146.3,x:303.2,y:380.9,startPosition:13},0).wait(1).to({regX:86.9,regY:-3.8,skewX:29.7,skewY:-150.3,x:307.3,y:383.7},0).wait(1).to({regX:86.7,regY:-3.6,skewX:27.4,skewY:-152.6,x:308.9,y:386.9},0).wait(2).to({x:310.4,y:389.7},0).wait(14).to({skewX:27.1,skewY:-152.9,y:387.3},0).wait(3).to({regX:86.8,skewX:24.7,skewY:-155.3,x:303.7,y:382.8},0).wait(1).to({regX:120.8,regY:8.4,scaleX:1.2,scaleY:1.26,skewX:-4.5,skewY:-184.5,x:249.3,y:385,startPosition:11},0).wait(1).to({regX:87,regY:-3.5,scaleX:1.27,scaleY:1.27,skewX:25.4,skewY:-154.6,x:273.1,y:359.6,startPosition:14},0).wait(1).to({regX:86.9,skewX:19.4,skewY:-160.6,x:262.8,y:358.3},0).wait(1).to({regX:87,skewX:16.8,skewY:-163.2,x:258,y:357.8},0).wait(2).to({skewX:15.5,skewY:-164.5,x:256.5,y:357.7},0).wait(2).to({skewX:16.8,skewY:-163.2,x:258.1,y:357.8},0).wait(12).to({regY:-3.8,scaleX:1.27,scaleY:1.27,skewX:15.8,skewY:-164.2,x:255.8,y:357.4},0).wait(2).to({regY:-3.6,skewX:14.3,skewY:-165.7,x:253.3,y:357.5},0).wait(2).to({skewX:15.1,skewY:-164.9,x:251.6,y:357.4},0).wait(1).to({skewX:22.6,skewY:-157.4,x:275,y:360.7,startPosition:15},0).wait(1).to({regY:-3.5,skewX:30.2,skewY:-149.8,x:298.2,y:367,startPosition:16},0).wait(1).to({scaleX:1.27,scaleY:1.27,skewX:38.1,skewY:-140.8,x:307.9,y:372.8,startPosition:17},0).wait(2).to({skewX:35.6,skewY:-144.4,x:306.2,y:372.1},0).wait(2).to({regX:87.2,regY:-3.8,skewX:32.8,skewY:-147.2,x:303.5,y:370.8},0).wait(2).to({regX:87,regY:-3.6,skewX:31.2,skewY:-148.8,x:301.5,y:370.4},0).wait(7).to({regY:-3.4,scaleX:1.28,scaleY:1.28,skewX:31.7,skewY:-148.3,x:303.2,y:371.8,startPosition:24},0).wait(1).to({regY:-3.6,scaleX:1.3,scaleY:1.3,skewX:32,skewY:-148,x:304.5,y:373,startPosition:25},0).wait(1).to({scaleX:1.37,scaleY:1.37,skewX:34.8,skewY:-145.2,x:308.3,y:375.9,startPosition:26},0).wait(2).to({scaleX:1.35,scaleY:1.35,skewX:33.8,skewY:-146.2,x:307.8,y:375.3},0).wait(2).to({scaleX:1.33,scaleY:1.33,skewX:33,skewY:-147,x:307.3},0).wait(25).to({scaleX:1.32,scaleY:1.32,skewX:32.8,skewY:-147.2,x:311.1,y:376.6},0).wait(2).to({regX:86.9,scaleX:1.29,scaleY:1.29,skewX:28.2,skewY:-151.8,x:292.5,y:370.1,startPosition:27},0).wait(1).to({scaleX:1.26,scaleY:1.26,skewX:22.9,skewY:-157.1,x:275.9,y:365.9,startPosition:28},0).wait(1).to({regX:87.2,skewX:10.6,skewY:-169.8,x:257.6,y:358.9,startPosition:2},0).wait(2).to({regX:87,skewX:10.4,skewY:-169.6,x:260.6,y:359.2},0).wait(2).to({scaleX:1.26,scaleY:1.26,skewX:10.6,skewY:-169.4,x:263,y:359.5},0).wait(17));

	// FIZ34_Skate1_ArmR
	this.instance_11 = new lib.FIZ34_Skate1_CollarFR("single",0);
	this.instance_11.setTransform(215.1,350.8,1.274,1.274,0,0.9,-179.1,13.7,28.1);

	this.timeline.addTween(cjs.Tween.get(this.instance_11).wait(1).to({regX:13.8,regY:28,scaleX:1.27,scaleY:1.27,skewX:2.7,skewY:-177.3,x:223,y:349.9},0).wait(1).to({regX:13.9,regY:28.1,skewX:4.5,skewY:-175.5,x:227.1,y:349.2},0).wait(1).to({regX:13.8,skewX:5.5,skewY:-174.5,x:229,y:349},0).wait(23).to({skewX:6.4,skewY:-173.6,x:230.8,y:348.7},0).wait(4).to({skewX:6.2,skewY:-173.8,x:227.7,y:348.6},0).wait(1).to({regX:13.9,regY:28.2,scaleX:1.27,scaleY:1.27,skewX:-0.6,skewY:-180.6,x:219.4,y:351.2},0).wait(1).to({regY:28.1,skewX:-7.9,skewY:-187.9,x:208.9,y:354.5},0).wait(1).to({regX:14,skewX:-10.2,skewY:-190.2,x:206.1,y:355.4},0).wait(1).to({regY:28.2,scaleX:1.27,scaleY:1.27,skewX:-11.3,skewY:-191.3,x:204.4,y:356},0).wait(24).to({regX:14.1,regY:28.3,skewX:-12.2,skewY:-192.2,x:203.5,y:356.6},0).wait(2).to({skewX:-13,skewY:-193,x:202.6,y:356.9},0).wait(2).to({regX:14.2,regY:28.2,skewX:-11.7,skewY:-191.7,x:211.2,y:355.4},0).wait(1).to({scaleX:1.27,scaleY:1.27,skewX:-5.9,skewY:-185.9,x:227.3,y:353},0).wait(1).to({regX:14.1,skewX:2.5,skewY:-177.5,x:251.2,y:361.1},0).wait(1).to({regY:28.3,skewX:4.7,skewY:-175.3,x:259.4,y:365.9},0).wait(1).to({regX:14,scaleX:1.27,scaleY:1.27,skewX:5.4,skewY:-174.6,x:264,y:367.8},0).wait(1).to({regY:28.4,skewX:5.7,skewY:-174.3,x:265.6,y:370.6},0).wait(2).to({skewX:6.3,skewY:-173.7,x:267.2,y:373},0).wait(4).to({regX:14.1,regY:28.3,skewX:6,skewY:-174,x:266.2,y:370.4},0).wait(12).to({regX:14,regY:28.4,skewX:6.8,skewY:-173.2,x:268.7,y:370.8},0).wait(1).to({skewX:6.3,skewY:-173.7,x:260.2,y:367.2},0).wait(1).to({regY:28.3,scaleX:1.27,scaleY:1.27,skewX:4,skewY:-176,x:249.8,y:360.4},0).wait(1).to({regX:14.2,regY:28.2,scaleX:1.27,scaleY:1.27,skewX:-5.9,skewY:-185.9,x:227.3,y:353},0).wait(1).to({skewX:-10,skewY:-190,x:216.7,y:354.5},0).wait(1).to({regX:14.3,regY:28.3,skewX:-11.8,skewY:-191.8,x:211.8,y:355.5},0).wait(2).to({regX:14.2,skewX:-12.3,skewY:-192.3,x:210.3,y:355.8},0).wait(2).to({regX:14.3,skewX:-11.8,skewY:-191.8,x:211.9,y:355.5},0).wait(12).to({regY:28.4,scaleX:1.27,scaleY:1.27,skewX:-12.3,skewY:-192.3,x:209.6,y:355.7},0).wait(2).to({regX:14.2,regY:28.3,skewX:-14.4,skewY:-194.4,x:207.1,y:356.8},0).wait(2).to({regY:28.4,skewX:-15.7,skewY:-195.7,x:205.4,y:357.5},0).wait(1).to({regY:28.3,skewX:-6.4,skewY:-186.4,x:229.3,y:354},0).wait(1).to({skewX:1.3,skewY:-178.7,x:253.8,y:354.4},0).wait(1).to({regX:14.3,regY:28.4,scaleX:1.27,scaleY:1.27,skewX:10.7,skewY:-169.3,x:264.9,y:355.9},0).wait(2).to({skewX:9.2,skewY:-170.8,x:263.1,y:355.8},0).wait(2).to({regX:14.4,skewX:8.1,skewY:-171.9,x:260.1,y:355.6},0).wait(2).to({regX:14.3,skewX:7.1,skewY:-172.9,x:257.8,y:355.7},0).wait(7).to({regY:28.3,scaleX:1.28,scaleY:1.28,skewX:7.5,skewY:-172.5,x:259.3,y:356.3},0).wait(1).to({regX:14.2,regY:28.4,scaleX:1.3,scaleY:1.3,skewX:8.1,skewY:-171.9,x:260,y:357.1},0).wait(1).to({regX:14.4,scaleX:1.35,scaleY:1.35,skewX:9.1,skewY:-170.9,x:261.9,y:359.5},0).wait(4).to({regX:14.3,scaleX:1.33,scaleY:1.33,x:262.1,y:358.5},0).wait(23).to({regX:14.2,regY:28.3,scaleX:1.32,scaleY:1.32,skewX:10.1,skewY:-169.9,x:263.4,y:358.1},0).wait(2).to({regX:14.3,regY:28.4,skewX:11.5,skewY:-168.5,x:266.8,y:358.4},0).wait(2).to({regX:14.2,regY:28.3,scaleX:1.3,scaleY:1.3,skewX:4.6,skewY:-175.4,x:247.2,y:356.8},0).wait(1).to({regX:14.3,scaleX:1.29,scaleY:1.29,skewX:-0.7,skewY:-180.7,x:230,y:356.7},0).wait(1).to({scaleX:1.27,scaleY:1.27,skewX:-8,skewY:-188,x:212,y:358.4},0).wait(2).to({regX:14.6,regY:28.4,skewX:-7.1,skewY:-187.1,x:214.6,y:358},0).wait(2).to({regX:14.4,skewX:-5.8,skewY:-185.8,x:217.2,y:357.5},0).wait(2).to({skewX:-5,skewY:-185,x:218.2,y:357.1},0).wait(15));

	// FIZ34_Skate1_ApronTieBK
	this.instance_12 = new lib.FIZ34_Skate1_HeadNestks("synched",92,false);
	this.instance_12.setTransform(233.3,356.1,1.274,1.274,0,0.9,-179.1,103.1,310.4);

	this.timeline.addTween(cjs.Tween.get(this.instance_12).wait(1).to({regX:103.3,regY:310.3,scaleX:1.27,scaleY:1.27,skewX:2.7,skewY:-177.3,x:241.1,y:355.8,startPosition:93},0).wait(1).to({skewX:4.5,skewY:-175.5,x:245.1,y:355.7,startPosition:94},0).wait(1).to({regY:310.4,skewX:5.5,skewY:-174.5,x:246.7,y:355.8,startPosition:95},0).wait(2).to({skewX:5.8,skewY:-174.2,x:247.5,startPosition:97},0).wait(21).to({regX:103.2,skewX:6.4,skewY:-173.6,x:248.6,y:355.7,startPosition:118},0).wait(2).to({regY:310.5,skewX:6.7,skewY:-173.3,x:249.6,y:355.8,startPosition:120},0).wait(2).to({regY:310.4,skewX:6.2,skewY:-173.8,x:245.5,y:355.6,startPosition:122},0).wait(1).to({scaleX:1.27,scaleY:1.27,skewX:-0.6,skewY:-180.6,x:238,y:355.9,startPosition:123},0).wait(1).to({regX:103.1,skewX:-7.9,skewY:-187.9,x:228,y:356.9,startPosition:124},0).wait(1).to({regX:103.2,skewX:-10.2,skewY:-190.2,x:225.3,y:357.1,startPosition:125},0).wait(1).to({regX:103.3,regY:310.6,scaleX:1.27,scaleY:1.27,skewX:-11.3,skewY:-191.3,x:223.6,y:357.5,startPosition:126},0).wait(2).to({regX:103.4,skewX:-11.9,skewY:-191.9,x:222.5,startPosition:128},0).wait(2).to({skewX:-11.6,skewY:-191.6,x:223.6,y:357.4,startPosition:130},0).wait(20).to({skewX:-12.2,skewY:-192.2,x:222.7,y:357.6,startPosition:150},0).wait(2).to({regY:310.7,skewX:-13,skewY:-193,x:221.9,y:357.8,startPosition:152},0).wait(2).to({skewX:-11.7,skewY:-191.7,x:230.7,y:356.8,startPosition:154},0).wait(1).to({scaleX:1.27,scaleY:1.27,skewX:-5.9,skewY:-185.9,x:246.6,y:356.3,startPosition:155},0).wait(1).to({skewX:2.5,skewY:-177.5,x:269.8,y:367.1,startPosition:156},0).wait(1).to({skewX:4.7,skewY:-175.3,x:277.8,y:372.5,startPosition:157},0).wait(1).to({scaleX:1.27,scaleY:1.27,skewX:5.4,skewY:-174.6,x:282.2,y:374.8,startPosition:158},0).wait(1).to({regX:103.5,skewX:5.7,skewY:-174.3,x:283.7,y:377.4,startPosition:159},0).wait(2).to({skewX:6.3,skewY:-173.7,x:285.3,y:380,startPosition:161},0).wait(2).to({regY:310.8,skewX:6.2,skewY:-173.8,x:285.2,y:378.9,startPosition:163},0).wait(2).to({skewX:6,skewY:-174,x:284.5,y:377.5,startPosition:165},0).wait(10).to({skewX:6.3,skewY:-173.7,x:285.3,y:377.7,startPosition:175},0).wait(2).to({skewX:6.8,skewY:-173.2,x:286.7,y:378,startPosition:177},0).wait(1).to({regX:103.6,regY:310.9,skewX:6.3,skewY:-173.7,x:278.2,y:374.3,startPosition:178},0).wait(1).to({regY:310.8,scaleX:1.27,scaleY:1.27,skewX:4,skewY:-176,x:268.2,y:366.7,startPosition:179},0).wait(1).to({regX:103.4,regY:310.7,scaleX:1.27,scaleY:1.27,skewX:-5.9,skewY:-185.9,x:246.6,y:356.3,startPosition:180},0).wait(1).to({regY:310.6,skewX:-10,skewY:-190,x:236,y:356.4,startPosition:181},0).wait(1).to({regX:103.5,skewX:-11.8,skewY:-191.8,x:231.1,y:356.7,startPosition:182},0).wait(2).to({regX:103.4,regY:310.5,skewX:-12.3,skewY:-192.3,x:229.6,startPosition:184},0).wait(2).to({regY:310.6,skewX:-11.8,skewY:-191.8,x:231.3,y:356.6,startPosition:186},0).wait(2).to({skewX:-11.5,skewY:-191.5,x:232.1,startPosition:188},0).wait(10).to({regY:310.7,scaleX:1.27,scaleY:1.27,skewX:-12.3,skewY:-192.3,x:229,y:356.7,startPosition:198},0).wait(2).to({regY:310.6,skewX:-14.4,skewY:-194.4,x:226.5,y:357,startPosition:200},0).wait(2).to({regX:103.3,regY:310.7,skewX:-15.7,skewY:-195.7,x:224.9,y:357.3,startPosition:202},0).wait(1).to({regY:310.6,skewX:-6.4,skewY:-186.4,x:248.5,y:357.1,startPosition:203},0).wait(1).to({regX:103.4,regY:310.7,skewX:1.3,skewY:-178.7,x:272.5,y:360,startPosition:204},0).wait(1).to({regX:103.3,regY:310.5,scaleX:1.27,scaleY:1.27,skewX:10.7,skewY:-169.3,x:282.3,y:364,startPosition:205},0).wait(2).to({regX:103.6,regY:310.6,skewX:9.2,skewY:-170.8,x:280.6,y:363.7,startPosition:207},0).wait(2).to({regY:310.8,skewX:8.1,skewY:-171.9,x:277.8,y:363.1,startPosition:209},0).wait(2).to({regX:103.4,regY:310.6,skewX:7.1,skewY:-172.9,x:275.8,y:362.9,startPosition:211},0).wait(3).to({regX:103.5,scaleX:1.26,scaleY:1.26,x:275.7,y:362.6,startPosition:214},0).wait(2).to({regX:103.4,scaleX:1.26,scaleY:1.26,x:275.8,y:362.2,startPosition:216},0).wait(2).to({regY:310.7,scaleX:1.28,scaleY:1.28,skewX:7.5,skewY:-172.5,x:277.2,y:363.9,startPosition:218},0).wait(1).to({scaleX:1.3,scaleY:1.3,skewX:8.1,skewY:-171.9,x:278.1,y:365,startPosition:219},0).wait(1).to({regY:310.6,scaleX:1.35,scaleY:1.35,skewX:9.1,skewY:-170.9,x:280.7,y:367.8,startPosition:220},0).wait(2).to({regX:103.3,scaleX:1.33,scaleY:1.33,x:280.6,y:366.9,startPosition:222},0).wait(2).to({regY:310.7,scaleX:1.33,scaleY:1.33,y:366.7,startPosition:224},0).wait(2).to({regX:103.4,scaleX:1.32,scaleY:1.32,y:366.4,startPosition:226},0).wait(21).to({skewX:10.1,skewY:-169.9,x:281.6,y:366.6,startPosition:247},0).wait(2).to({regX:103.3,regY:310.6,skewX:11.5,skewY:-168.5,x:285,y:367.3,startPosition:249},0).wait(2).to({regX:103.5,regY:310.8,scaleX:1.3,scaleY:1.3,skewX:4.6,skewY:-175.4,x:265.8,y:363.7,startPosition:251},0).wait(1).to({regY:310.7,scaleX:1.29,scaleY:1.29,skewX:-0.7,skewY:-180.7,x:249,y:361.7,startPosition:252},0).wait(1).to({regX:103.6,scaleX:1.27,scaleY:1.27,skewX:-8,skewY:-188,x:231,y:360.9,startPosition:253},0).wait(2).to({skewX:-7.1,skewY:-187.1,x:233.9,y:360.5,startPosition:255},0).wait(2).to({regX:103.5,skewX:-5.8,skewY:-185.8,x:236.3,startPosition:257},0).wait(2).to({skewX:-5,skewY:-185,x:237.4,startPosition:259},0).wait(15));

	// FIZ34_Skate1_CollarFR
	this.instance_13 = new lib.FIZ34_Skate1_CollarBK("single",0);
	this.instance_13.setTransform(236.6,361.8,1.274,1.274,0,0.9,-179.1,46.5,44.6);

	this.timeline.addTween(cjs.Tween.get(this.instance_13).wait(1).to({regX:46.4,scaleX:1.27,scaleY:1.27,skewX:2.7,skewY:-177.3,x:244.4,y:361.7},0).wait(1).to({regX:46.5,regY:44.8,skewX:4.5,skewY:-175.5,x:248.1,y:361.8},0).wait(1).to({skewX:5.5,skewY:-174.5,x:249.5},0).wait(23).to({skewX:6.4,skewY:-173.6,x:251.2},0).wait(4).to({regX:46.6,skewX:6.2,skewY:-173.8,x:248.2,y:361.7},0).wait(1).to({scaleX:1.27,scaleY:1.27,skewX:-0.6,skewY:-180.6,x:241.4,y:361.6},0).wait(1).to({regX:46.5,skewX:-7.9,skewY:-187.9,x:232,y:362.1},0).wait(1).to({skewX:-10.2,skewY:-190.2,x:229.6},0).wait(1).to({regX:46.4,scaleX:1.27,scaleY:1.27,skewX:-11.3,skewY:-191.3,x:228.1},0).wait(4).to({regY:44.9,skewX:-12.1,skewY:-192.1,x:228.3},0).wait(22).to({skewX:-13.5,skewY:-193.5,x:226.8,y:362.3},0).wait(2).to({regX:46.3,regY:44.8,skewX:-12.2,skewY:-192.2,x:235.5,y:361.3},0).wait(1).to({regX:46.2,scaleX:1.27,scaleY:1.27,skewX:-6.4,skewY:-186.4,x:250.9},0).wait(1).to({regX:46.1,regY:44.7,skewX:1.9,skewY:-178.1,x:273.4,y:372.6},0).wait(1).to({scaleX:1.27,scaleY:1.27,skewX:4.2,skewY:-175.8,x:281.2,y:378.2},0).wait(1).to({regY:44.6,skewX:4.9,skewY:-175.1,x:285.5,y:380.4},0).wait(1).to({regY:44.7,skewX:5.2,skewY:-174.8,x:287,y:383.2},0).wait(2).to({skewX:5.7,skewY:-174.3,x:288.5,y:385.9},0).wait(4).to({regY:44.8,skewX:5.4,skewY:-174.6,x:287.7,y:383.4},0).wait(12).to({regY:44.7,skewX:6.3,skewY:-173.7,x:289.9,y:383.9},0).wait(1).to({regY:44.6,skewX:5.8,skewY:-174.2,x:281.6,y:380},0).wait(1).to({scaleX:1.27,scaleY:1.27,skewX:3.5,skewY:-176.5,x:271.8,y:372.4},0).wait(1).to({regX:46.2,regY:44.8,scaleX:1.27,scaleY:1.27,skewX:-6.4,skewY:-186.4,x:250.9,y:361.3},0).wait(1).to({regX:46.1,regY:44.6,skewX:-10.5,skewY:-190.5,x:240.8,y:361},0).wait(1).to({skewX:-12.3,skewY:-192.3,x:236.1,y:361.1},0).wait(2).to({regX:46.2,skewX:-12.8,skewY:-192.8,x:234.5,y:361.3},0).wait(2).to({regX:46.1,skewX:-12.3,skewY:-192.3,x:236.2,y:361},0).wait(12).to({regX:46.2,scaleX:1.27,scaleY:1.27,skewX:-12.8,skewY:-192.8,x:233.8,y:361.2},0).wait(2).to({regX:46.1,skewX:-14.9,skewY:-194.9,x:231.6},0).wait(2).to({regX:46.2,skewX:-16.3,skewY:-196.3,x:229.8,y:361.4},0).wait(1).to({regX:46.1,skewX:-6.9,skewY:-186.9,x:252.9,y:361.9},0).wait(1).to({regX:46.3,skewX:0.7,skewY:-179.3,x:275.9,y:365.2},0).wait(1).to({regX:46.1,scaleX:1.27,scaleY:1.27,skewX:10.2,skewY:-169.8,x:285,y:370.2},0).wait(2).to({regX:46.3,skewX:8.7,skewY:-171.3,x:283.4,y:369.7},0).wait(2).to({regY:44.5,skewX:7.5,skewY:-172.5,x:280.8,y:369},0).wait(2).to({regX:46.1,regY:44.6,skewX:6.5,skewY:-173.5,x:278.9,y:368.8},0).wait(7).to({regY:44.5,scaleX:1.28,scaleY:1.28,skewX:7,skewY:-173,x:280.3,y:369.7},0).wait(1).to({regY:44.6,scaleX:1.3,scaleY:1.3,skewX:7.6,skewY:-172.4,x:281.3,y:370.9},0).wait(1).to({regX:46.2,regY:44.5,scaleX:1.35,scaleY:1.35,skewX:8.6,skewY:-171.4,x:283.7,y:374.1},0).wait(4).to({regX:46.1,regY:44.6,scaleX:1.33,scaleY:1.33,x:283.6,y:372.9},0).wait(23).to({regX:46.3,scaleX:1.32,scaleY:1.32,skewX:9.6,skewY:-170.4,x:284.2,y:372.8},0).wait(2).to({regX:46.2,skewX:10.9,skewY:-169.1,x:287.6,y:373.6},0).wait(2).to({regX:46.3,scaleX:1.3,scaleY:1.3,skewX:4,skewY:-176,x:269.1,y:369.3},0).wait(1).to({regX:46.2,scaleX:1.29,scaleY:1.29,skewX:-1.2,skewY:-181.2,x:252.9,y:367.1},0).wait(1).to({regX:46.1,regY:44.4,scaleX:1.27,scaleY:1.27,skewX:-8.5,skewY:-188.5,x:235.6,y:365.5},0).wait(2).to({regX:46.3,skewX:-7.6,skewY:-187.6,x:238.4,y:365.3},0).wait(2).to({regX:46.1,skewX:-6.3,skewY:-186.3,x:240.8,y:365.4},0).wait(2).to({skewX:-5.5,skewY:-185.5,x:241.6},0).wait(15));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(104.8,22.7,261.4,542);


// stage content:



(lib.sample = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{Hi:0,"I am":32,test:64,say:161});

	// FIZ34_Skate1_Apron
	this.instance = new lib.test("synched",0);
	this.instance.setTransform(118.1,135.2,0.45,0.45,0,0,0,235.6,293.9);

	this.timeline.addTween(cjs.Tween.get(this.instance).wait(32).to({startPosition:32},0).wait(32).to({startPosition:64},0).wait(97).to({startPosition:161},0).wait(21));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(178.2,150.1,117.6,243.9);

})(lib = lib||{}, images = images||{}, createjs = createjs||{}, ss = ss||{});
var lib, images, createjs, ss;