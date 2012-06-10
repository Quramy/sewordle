var opts = {
	default:{
		width:850,
		height:600,
		maxFontSize:80,
		minFontSize:10,
		count:200,
		font:'Arial',
		ignoreMultiByteChar:true,
		historyMaxResults:10000,
		rotator: 'cross',
		filler: 'Random'
	}
};

var fonts = [
	'Antiqua',
	'Arial',
	'Avqest',
	'Blackletter',
	'Calibri',
	'Comic Sans',
	'Courier',
	'Decorative',
	'Fraktur',
	'Frosty',
	'Garamond',
	'Georgia',
	'Helvetica',
	'Impact',
	'Minion',
	'Modern',
	'Monospace',
	'Palatino',
	'Roman',
	'Script',
	'Swiss',
	'Times New Roman',
	'Verdana'
];

(function(){
	// setting option values to UI.
	var setOpts = function(opts){
		$('#width').val(opts.width);
		$('#height').val(opts.height);
		$('#count').val(opts.count);
		// $('#font').val(opts.font);
		$('#font').text(opts.font);
		$('#filler').text(opts.filler);
		// $('input[name=rotator]').removeAttr('checked').filter('[value='+opts.rotator+']').attr('checked', 'checked');
		$('#rotator button').removeClass('active').filter('[data-rotate-type='+opts.rotator+']').addClass('active');
		//$('#ignoreMultiByteChar').attr('checked', opts.ignoreMultiByteChar);

	};

	// getting option values from UI.
	var getOpts = function(){
		opts.width = $('#width').val();
		opts.height = $('#height').val();
		opts.font = $('#font').text();
		opts.filler= $('#filler').text();
		opts.count = $('#count').val();
		//opts.rotator = $('input:radio[name=rotator]:checked').val();
		opts.rotator = $('#rotator button.active').attr('data-rotate-type');
		//opts.ignoreMultiByteChar = $('#ignoreMultiByteChar:checked').length > 0;
	};

	var rotationBy = {
		cross: function(d){
			return (~~(Math.random() * 3) - 1) * 90;
		},
		analog: function(d){
			return Math.random() * 180 - 90; 
		},
		horizontal: function(){
			return 0;
		}
	};

	var getFiller = function(type){
		var genFromColorbrewer = function(name){
			return d3.scale.ordinal().range(colorbrewer[name][9].slice(2,9));
		};
		var name = type.toLowerCase();
		if(name === 'grey'){
			return genFromColorbrewer('Greys');
		}else if(name === 'blue'){
			return genFromColorbrewer('Blues');
		}else if(name === 'red'){
			return genFromColorbrewer('Reds');
		}else if(name === 'green'){
			return genFromColorbrewer('Greens');
		}else if(name === 'purple'){
			return genFromColorbrewer('Purples');
		}else if(name === 'orange'){
			return genFromColorbrewer('Oranges');
		}else{
			return d3.scale.category20b();
		}
	};

	var wordle = function(){
		var st = new Date();
		getOpts();
		toggleUI('start');
		chrome.extension.sendRequest({type: 'save', key: 'opts', value: opts});
		chrome.extension.sendRequest({
			type:'history',
			params: {
				startTime: 0,
				maxResults: opts.historyMaxResults
			}
		}, function(res){

			var dataSet = summarize(opts, res);
			var target = dataSet.data;
			var maxCount, minDate, maxDate, target;
			maxCount = dataSet.maxCount;
			minDate = dataSet.minDate;
			maxDate = dataSet.maxDate;

			var pc=0;

			//var fontSize = d3.scale.log().range([opts.minFontSize, opts.maxFontSize]);
			var maxFontSize = Math.sqrt(opts.height * opts.width) / 9;
			var fontSize = d3.scale.log().range([opts.minFontSize, maxFontSize]);
			fontSize.domain([1, maxCount]);

			var layout = d3.layout.cloud().size([opts.width, opts.height])
			.words(target.map(function(word) {
				return {
					text: word.key, 
					size: word.count
				};
			}))
			.font(opts.font)
			.fontSize(function(d) { 
				return fontSize(+d.size);
			})
			.rotate(rotationBy[opts.rotator])
			.padding(2)
			.on('word', function(){
				var p = ++pc*100/opts.count;
				//$('#progress div.bar').width(p+'%');
				$('#progress').progressbar({value:p});
			})
			.spiral('rectangular');

			//console.log(new Date()-st);
			//layout.on('end', 
			var render = function(words){
				toggleUI('prerender');
				wordLayout=words;
				fill=getFiller(opts.filler);
				texts = d3.select('#cloud').append('svg')
				.attr('width', opts.width)
				.attr('height', opts.height)
				.append('g')
				.attr('transform', 'translate('+opts.width/2+','+opts.height/2+')')
				.selectAll('text')
				.data(words)
				.enter().append('text')
				.attr('id', function(d){
					var arr = ['txt_'], i, c, txtId;
					for(i = 0;i < d.text.length; i++){
						c = d.text.charCodeAt(i);
						arr.push(c>64&&c<123?d.text[i]:'_'+c);
					}
					target.get(d.text).txtId = txtId = arr.join('');
					return txtId;
				})
				.style('cursor', 'pointer')
				.style('font-size', function(d) { return d.size + 'px'; })
				.attr('text-anchor', 'middle')
				.style('font-family', function(d){return d.font;})
				.attr('fill', function(d){
					var fillColor = fill(d.text);
					target.get(d.text).fillColor = fillColor;
					return fillColor;
				})
				.on('mouseover', function(d){
					d3.select(this).attr('stroke', target.get(d.text).fillColor).attr('fill', 'white');
				})
				.on('mouseout', function(d){
					d3.select(this).attr('fill', target.get(d.text).fillColor).attr('stroke', 'none');
				})
				.on('click', function(d){
					var adjIds = target.get(d.text).adjoints.map(function(t){return '#' + t.txtId}).join();
					adjIds === '' ? null : d3.selectAll(adjIds)
					.transition().delay(0).duration(200)
					.attr('fill', 'white')
					.transition().delay(200).duration(600).attr('fill', function(d){return target.get(d.text).fillColor});
				})
				.attr('transform', function(d) {
					return 'translate(' + [d.x, d.y] + ')rotate(' + d.rotate + ')';
				})
				.text(function(d) { return d.text; });
				toggleUI('end');
			};
			layout.timeInterval(10).on('end', render).start();
		});
	};




	var wordLayout,texts;
	var fill = d3.scale.category20b();
	//var fill = d3.scale.ordinal().range(colorbrewer.BuPu[9]);


	var downloadPNG = function() {
		var w=opts.width, h=opts.height;
		var canvas = document.createElement('canvas'),
		c = canvas.getContext('2d');
		canvas.width = w;
		canvas.height = h;
		c.translate(w >> 1, h >> 1);
		words=wordLayout;
		words.forEach(function(word, i) {
			c.save();
			c.translate(word.x, word.y);
			c.rotate(word.rotate * Math.PI / 180);
			c.textAlign = 'center';
			c.fillStyle = fill(word.text.toLowerCase());
			c.font = word.size + 'px ' + word.font;
			c.fillText(word.text, 0, 0);
			c.restore();
		});
		$(this).attr('href',canvas.toDataURL('image/png'));
	};

	var toggleUI = function(state){
		if(state === 'end'){
			$('#generate').addClass('btn-primary').removeClass('disabled');
			$('#getpng').addClass('btn-success').removeClass('disabled');
		}else if(state === 'start'){
			$('#cloud').find('svg').remove().end().height(opts.height + 'px').width(opts.width + 'px');
			$('#progress').progressbar({value:0}).css('top',opts.height/2-20+'px').show();
			$('#generate').removeClass('btn-primary').addClass('disabled');
			$('#getpng').removeClass('btn-success').addClass('disabled');
		}else if(state === 'prerender'){
			$('#progress').hide();
		}
	};

	chrome.extension.sendRequest({type:'load', key:'opts'}, function(res){
		opts = $.extend('', opts.default, res);
		setOpts(opts);
		$('#generate').click(wordle);
		$('#getpng').click(downloadPNG);
	});

	var init = function(){
		fonts.forEach(function(it){
			$('#font-list').append($('<li><a href="#">'+it+'</a></li>').css('font-family',it));
		});
		$('#font-list a').click(function(){
			$('#font').text($(this).text());
		});
		$('#color-list a').click(function(){
			$('#filler').text($(this).text());
		});
		$('#progress').progressbar({value:0}).hide();
	};
	init();

	var summarize = function(opts, res){
		var wordMap={}, words=[],maxCount = -1;
		var minDate= new Date(),maxDate=0;
		res.forEach(function(history){
			var query=[];
			var adjoints=[];
			if(query=history.url.match(/(www\.google|www\.bing\.com|yahoo).*search.*[&\?#]q=([^&]+)/)){
				(adjoints = decodeURIComponent(query[2]).split(/[\+\s]/).map(function(it){return it.toLowerCase();})).forEach(function(word){
					var ref;
					if(opts.ignoreMultiByteChar && !word.match(/^[\x01-\x7f]+$/)) return;
					if(!wordMap[word]){
						ref = {
							key: word,
							count: 0,
							histories: [],
							date: history.lastVisitTime,
							adjointMap: {}
						};
						words.push(word);
						wordMap[word] = ref;
					}else{
						(ref=wordMap[word]).count++;
						ref.date = history.lastVisitTime > ref.date ? history.lastVisitTime:ref.date;
					}
					adjoints.forEach(function(it){
						if(it !== word){
							ref.adjointMap[it]=it;
						}
					});
					ref.histories.push(history);
					maxCount = ref.count > maxCount ? ref.count : maxCount;
					maxDate = Math.max(maxDate, ref.date);
					minDate = Math.min(minDate, ref.date);
				});
			}
		});
		target = words.sort(function(a,b){
			var diffCount = wordMap[b].count-wordMap[a].count;
			return diffCount !== 0 ? diffCount : wordMap[b].date - wordMap[a].date;
		}).slice(0, opts.count).map(function(word){
			return {
				key: word,
				count: wordMap[word].count,
				date: wordMap[word].date,
				adjoints: []
			};
		});
		var indexMap = {};
		target.forEach(function(word, i){indexMap[word.key] = i;});
		target.indexOf = function(arg){
			var key;
			if(typeof(arg) === 'string'){
				key = arg;
			}else{
				key = arg.key;
			}
			return indexMap[key]>=0?indexMap[key]:-1;
		};
		target.get = function(key){
			return this[this.indexOf(key)];
		};
		target.forEach(function(word){
			for(adjoint in wordMap[word.key].adjointMap){
				if(target.indexOf(adjoint) !== -1){
					word.adjoints.push(target.get(adjoint));
				}
			}
		});
		return {
			data:target,
			maxCount:maxCount,
			minDate:minDate,
			maxDate:maxDate
		};
	};


})();
