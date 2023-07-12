// noinspection ES6ConvertVarToLetConst,JSUnresolvedReference

window.SysstatWeb = new (function () {
	var
		_this = this,
		jSystatWebNav,
		jSystatWebContent,
		jSystatWebTitle,
		jSystatWebBody,
		jSettingsForm
	;
	this.Config = {};
	this.Settings = {
		Interval: -24,
		PointRadius: 2,
		Group: ''
	};
	this.Chart = null;

	this.events = {};

	this.emit = this.trigger = function(event, id, p) {
		var i;
		if (!p && id instanceof Array) {
			p = id;
			id = null;
		}
		if (!(p instanceof Array)) p = [p];
		if (this.events[event]) {
			for (i=0; i < this.events[event].length; i++) {
				this.events[event][i].done = false;
				// nur eine Bestimmte id ausführen
				if (id && this.events[event][i].id !== id) continue;

				if (this.events[event][i].fn) {
					if (p.length === 0) this.events[event][i].fn();
					else if (p.length === 1) this.events[event][i].fn(p[0]);
					else if (p.length === 2) this.events[event][i].fn(p[0], p[1]);
					else if (p.length === 3) this.events[event][i].fn(p[0], p[1], p[2]);
					else if (p.length === 4) this.events[event][i].fn(p[0], p[1], p[2], p[3]);
					else if (p.length === 5) this.events[event][i].fn(p[0], p[1], p[2], p[3], p[4], p[5]);
					else if (p.length === 6) this.events[event][i].fn(p[0], p[1], p[2], p[3], p[4], p[5], p[6]);
					else if (p.length === 7) this.events[event][i].fn(p[0], p[1], p[2], p[3], p[4], p[5], p[6], p[7]);
					else if (p.length === 8) this.events[event][i].fn(p[0], p[1], p[2], p[3], p[4], p[5], p[6], p[7], p[8]);
					else if (p.length === 9) this.events[event][i].fn(p[0], p[1], p[2], p[3], p[4], p[5], p[6], p[7], p[8], p[9]);
					else if (p.length === 10) this.events[event][i].fn(p[0], p[1], p[2], p[3], p[4], p[5], p[6], p[7], p[8], p[9], p[10]);
				}
				this.events[event][i].done = true;
			}

			// Ereignisse aufräumen
			for(i= this.events[event].length-1; i >=0 ; i--) {
				if (!this.events[event][i].multiple && this.events[event][i].done) this.events[event].splice(i, 1);
			}
		}
	};

	var uniq = function() {
		return (new Date()).getTime() + '' + (Math.floor((Math.random() * 1000) + 1));
	};

	this.once = this.one = function(event, id, cb) {
		if (!cb) {
			cb = id;
			id = uniq(event);
		}
		if (!this.events[event]) this.events[event] = [];
		this.events[event].push({fn: cb, multiple: false, id: id});
	};

	this.on = function(event, id, cb) {
		if (!cb) {
			cb = id;
			id = uniq(event);
		}
		if (!this.events[event]) this.events[event] = [];
		this.events[event].push({fn: cb, multiple: true, id: id});
	};

	this.off = function(event, id) {
		if (this.events[event]) {
			if (typeof id != 'undefined' && id !== null) {
				for(var i=this.events[event].length-1; i >= 0; i--) {
					if (this.events[event][i].id === id) this.events[event].splice(i, 1);
				}
			} else {
				delete this.events[event];
			}
		}
	};

	function setCookie(cname, cvalue, exdays) {
		const d = new Date();
		d.setTime(d.getTime() + (exdays*24*60*60*1000));
		let expires = "expires="+ d.toUTCString();
		document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
	}

	function getCookie(cname) {
		let name = cname + "=";
		let decodedCookie = decodeURIComponent(document.cookie);
		let ca = decodedCookie.split(';');
		for(let i = 0; i <ca.length; i++) {
			let c = ca[i];
			while (c.charAt(0) === ' ') {
				c = c.substring(1);
			}
			if (c.indexOf(name) === 0) {
				return c.substring(name.length, c.length);
			}
		}
		return "";
	}

	this.stringToHash = function (str, asString, seed) {
		var i, l,
			hval = (seed === undefined) ? 0x811c9dc5 : seed;

		for (i = 0, l = str.length; i < l; i++) {
			hval ^= str.charCodeAt(i);
			hval += (hval << 1) + (hval << 4) + (hval << 7) + (hval << 8) + (hval << 24);
		}
		if(asString) {
			return ("0000000" + (hval >>> 0).toString(16)).substr(-8);
		}
		return hval >>> 0;
	};

	this.stringToColor = function (str, transparency) {
		var hex = this.stringToHash(str, true);
		var rgba = [
			parseInt(hex.substring(0, 2), 16),
			parseInt(hex.substring(2, 4), 16),
			parseInt(hex.substring(hex.length-2), 16),
			transparency || 0.5
		];

		return 'rgba('+rgba.join(', ')+')';
	};

	/**
	 *
	 * @param {string} id
	 * @param {string} ds_id
	 * @return {null|{datatype: string|undefined}}
	 */
	this.getDatasheet = function (id, ds_id) {
		if (this.Config[id] && this.Config[id].data && this.Config[id].data.datasets) {
			for (var i=0; i < this.Config[id].data.datasets.length; i++) {
				if (this.Config[id].data.datasets[i].id === ds_id) {
					return this.Config[id].data.datasets[i];
				}
			}
		}
		return null;
	};

	var _parseDataCache = {}
	this.parseData = function (id, date, data) {
		//var config = this.Config[id];
		//var base = config.base || 1;
		var ds, value;
		var lines = data.split("\n"), line, res = {}, bar, ts;
		for (var i=0; i < lines.length; i++) {
			line = lines[i].replace("\r", '').replace(".value", '').split(" ");
			if (line.length < 2) continue;

			bar = line[1];
			ts = date+' '+line[0];
			if (typeof res[ts] == 'undefined') res[ts] = {};
			ds = this.getDatasheet(id, bar);
			value = line[2];
			if (ds) {
				if (ds.datatype && ds.datatype.toLowerCase() === 'derive') {
					if (typeof _parseDataCache[bar] == 'undefined') _parseDataCache[bar] = line[2];
					value = line[2] - _parseDataCache[bar];
					_parseDataCache[bar] = line[2];
				}

				if (ds.min && value < ds.min) value = ds.min;
				if (ds.max && value > ds.max) value = ds.max;
			}

			res[ts][bar] = value;
		}

		return res;
	};

	/**
	 *
	 * @param {{}} data
	 * @param {"hourly"|"daily"|"weekly"} group
	 * @returns {{}|*}
	 */
	this.groupData = function (data, group) {
		var res = {},
			count = {},
			sum = {},
			current = null,
			ts,
			graph
		;
		switch (group) {
			case 'daily':
				count = {};
				sum = {};
				current = null;
				for (ts in data) {
					var id = ts.substring(0, 10);
					if (current === null) current = id;
					if (!res[current]) res[current] = {};

					for (graph in data[ts]) {
						if (!count[graph]) count[graph] = 0;
						if (!sum[graph]) sum[graph] = 0;
						if (current === id) {
							sum[graph] += parseFloat(data[ts][graph]);
							count[graph] += 1;
						}

						if (!res[current][graph]) res[current][graph] = {};
						if (count[graph] === 0) res[current][graph] = 0;
						else res[current][graph] = sum[graph] / count[graph];
					}

					// Reset
					if (current !== id) {
						current = id;
						count = {};
						sum = {};
					}
				}

				break;
			case 'hourly':
				count = {};
				sum = {};
				current = null;
				for (ts in data) {
					var id = ts.substring(0, 13);
					if (current === null) current = id;
					if (!res[current]) res[current] = {};

					for (graph in data[ts]) {
						if (!count[graph]) count[graph] = 0;
						if (!sum[graph]) sum[graph] = 0;
						if (current === id) {
							sum[graph] += parseFloat(data[ts][graph]);
							count[graph] += 1;
						}

						if (!res[current][graph]) res[current][graph] = {};
						if (count[graph] === 0) res[current][graph] = 0;
						else res[current][graph] = sum[graph] / count[graph];
					}

					// Reset
					if (current !== id) {
						current = id;
						count = {};
						sum = {};
					}
				}
				break;
			default: return data;
		}

		return res;
	};

	/**
	 * Get ISO Date String
	 * @param {Date} date
	 * @returns {string} yyyy-mm-dd
	 */
	this.toDateString = function (date) { return date.toISOString().substring(0, 10); };

	/**
	 * Get date as Int (Example: 20220101)
	 * @param {Date} date
	 * @return Number
	 */
	this.toDateNumber = function (date) {
		return parseInt(date.getFullYear()+''+(date.getMonth()+1)+''+date.getDate());
	};

	this.spinner = function () {
		return $('<div class="d-flex justify-content-center" />').append(
			$('<div class="spinner-border" role="status">').append(
				$('<span class="visually-hidden">Loading...</span>')
			)
		);
	}

	this.fromTime = function (fromTime) {
		if (typeof fromTime == "string") fromTime = new Date(fromTime);
		if (!fromTime) {
			fromTime = new Date();
			fromTime.setHours(fromTime.getHours() + parseInt(this.Settings.Interval));
		}
		return fromTime;
	};

	this.toTime = function (toTime) {
		if (typeof toTime == "string") toTime = new Date(toTime);
		if (!toTime) toTime = new Date();
		return toTime;
	};

	/**
	 * Load data
	 * @param {string} id
	 * @param {Date|null} fromTime
	 * @param {Date|null} toTime
	 * @param {(any) => void|null} cb
	 */
	this.load = function(id, fromTime, toTime, cb) {
		fromTime = this.fromTime(fromTime);
		toTime = this.toTime(toTime);

		var curDateStr = this.toDateString(new Date());
		var dates = [this.toDateString(fromTime)];
		var toDateNum = this.toDateNumber(toTime);
		var nextDay = new Date(fromTime.getTime());
		var group = null;

		if (!_this.Settings.Group) {
			var timeDiff = toTime - fromTime;
			var dateDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
			if (dateDiff > 7) group = 'daily';
			else if (dateDiff > 2) group = 'hourly';
		}
		else {
			group = _this.Settings.Group;
		}

		while (this.toDateNumber(nextDay) < toDateNum) {
			nextDay.setHours(nextDay.getHours() + 24);
			dates.push(this.toDateString(nextDay));
		}

		var StatData = {};
		var _q = function () {
			if (dates.length > 0) {
				var ts = dates.shift();
				var url = 'db/'+id+'.'+ts+'.db';
				if (ts === curDateStr) url += '?ts='+(new Date()).toISOString();
				var opts = {
					url: url,
					cache:false,
					success: function (data) {
						data = _this.parseData(id, ts, data);
						data = _this.groupData(data, group);
						$.extend(StatData, data);
						_this.emit('data', [data]);
						_q();
					},
					error: function (err, type, message) {
						_this.emit('data.error', [err]);
						if (typeof console != "undefined") console.warn('db/'+id+'.'+ts+'.db: '+message);
						_q();
					}
				};
				$.ajax(opts);
				return;
			}

			if (cb) cb(StatData);
			_this.emit('data.done', [StatData]);
		}

		// Get db data
		_q();
	};

	this.viewTitle = function (id, fromTime, toTime) {
		fromTime = this.fromTime(fromTime);
		toTime = this.toTime(toTime);
		var config = this.Config[id];

		var fromTimeInput = $('<input type="datetime-local" name="fromTime">')
			.addClass('form-control form-control-sm d-inline-block')
			.val(fromTime.toISOString().substring(0, 16))
		;

		var toTimeInput = $('<input type="datetime-local" name="toTime">')
			.addClass('form-control form-control-sm d-inline-block')
			.val(toTime.toISOString().substring(0, 16))
		;

		var _change = function () {
			_this.viewBody(id, fromTimeInput.val(), toTimeInput.val());
		};

		fromTimeInput.change(_change);
		toTimeInput.change(_change);

		jSystatWebTitle.html(
			$('<h5 />')
				.addClass('text-primary border-bottom border-primary py-2')
				.text(config.title)
				.append(
					$('<div class="float-end row" />')
						.append(
							$('<div class="col" />').append(fromTimeInput)
						)
						.append(
							$('<div class="col" />').append(toTimeInput)
						)
				)
		);
	};

	this.viewBody = function (id, fromTime, toTime) {
		fromTime = this.fromTime(fromTime);
		toTime = this.toTime(toTime);
		var config = this.Config[id];
		config.data.labels = [];

		// Optimize config
		if (!config.options) config.options = {};
		if (!config.options.elements) config.options.elements = {};
		if (!config.options.plugins) config.options.plugins = {};
		if (!config.options.elements.point) config.options.elements.point = {};
		config.options.elements.point.radius = _this.Settings.PointRadius;

		config.options.plugins.zoom = {
			zoom: {
				wheel: {
					enabled: true,
				},
				pinch: {
					enabled: true
				},
				mode: 'xy',
			}
		};

		var jSpinner = this.spinner();
		jSystatWebBody.html(jSpinner);
		var jCanvas = $('<canvas id="myChart" class="w-100"></canvas>');
		jCanvas.appendTo(jSystatWebBody);
		console.info(JSON.stringify(config));

		_this.Chart = new Chart(
			jCanvas[0],
			config
		);

		this.on('data', function (data) {
			var dsmap = {};

			for (var i=0; i < _this.Chart.data.datasets.length; i++) {
				dsmap[_this.Chart.data.datasets[i].id] = i;
				if (!_this.Chart.data.datasets[i].borderColor) {
					_this.Chart.data.datasets[i].borderColor = _this.stringToColor(_this.Chart.data.datasets[i].id);
					_this.Chart.data.datasets[i].backgroundColor = _this.Chart.data.datasets[i].borderColor;
				}
			}

			//var last_label = null, cur_label = null, length = Object.keys(data).length;

			for (var time in data) {
				/*if (length <= 36) {
					cur_label = time.substring(0, 16);
				}
				if (length <= 288) {
					cur_label = time.substring(0, 13);
				}
				else {
					cur_label = time.substring(0, 11);
				}

				if (last_label !== cur_label) {
					_this.Chart.data.labels.push(time);
					last_label = cur_label;
				}
				else {
					_this.Chart.data.labels.push('');
				}*/

				_this.Chart.data.labels.push(time);
				for (var bar in data[time]) {
					var index = dsmap[bar];
					if (typeof index !== "undefined") {
						if (!_this.Chart.data.datasets[index].data) _this.Chart.data.datasets[index].data = [];
						_this.Chart.data.datasets[index].data.push(data[time][bar]);
					}
				}
			}

			console.info(JSON.stringify(_this.Chart.data));
			_this.Chart.update();
		});

		this.on('data.done', function (data) {
			jSpinner.remove();
		});

		this.load(id, fromTime, toTime);
	};

	this.view = function (id, fromTime, toTime) {
		this.viewTitle(id, fromTime, toTime);
		this.viewBody(id, fromTime, toTime);
	};

	this.addMenuCat = function (name) {
		var id = 'Cat'+this.stringToHash(name, true);
		var jNav = $('#'+id);
		if (jNav.length < 1) {
			$('<div />')
				.attr('id', id)
				.append(
					$('<h6 />').text(name).addClass('text-primary border-bottom border-primary py-2')
				)
				.append(
					jNav = $('<ul />')
						.attr('id', id)
						.addClass('list-group')
				)
				.appendTo(jSystatWebNav)
		}

		return jNav;
	}

	this.addMenuItem = function(id) {
		var config = this.Config[id];
		if (!config) return false;
		var jMenu = this.addMenuCat(config.category);
		jMenu.append(
			$('<a />')
				.addClass("list-group-item py-1")
				.text(config.title)
				.data('id', id)
				.attr('data-id', id)
				.click(function () {
					_this.view(this.getAttribute('data-id'));
				})
		)
		return true;
	};

	// Init
	$(function () {
		jSystatWebNav = $('#SystatWebNav');
		jSystatWebContent = $('#SystatWebContent');
		jSystatWebTitle = $('#SystatWebTitle');
		jSystatWebBody = $('#SystatWebBody');
		jSettingsForm = $('#SettingsForm');

		// Load settings
		for (var i in _this.Settings) {
			_this.Settings[i] = getCookie(i) || _this.Settings[i];
			var jInput = jSettingsForm.find('[name="'+i+'"]');
			if (jInput.is('[type=checkbox]')) {
				jInput.attr('checked', jInput.val() === _this.Settings[i]);
			}
			else {
				jInput.val(_this.Settings[i]);
			}
		}

		// Save settings
		jSettingsForm.submit(function () {
			for (var e=0; e < this.elements.length; e++) {
				var el = this.elements[e];
				if (el.type && el.type === 'checkbox') {
					if (el.checked) {
						_this.Settings[el.name] = el.value;
					}
					else {
						delete _this.Settings[el.name];
					}
				}
				else {
					_this.Settings[el.name] = el.value;
				}

				if (_this.Settings[el.name]) {
					setCookie(el.name, el.value, 365);
				}
				else {
					setCookie(el.name, '', -1);
				}
			}
			return false;
		});

		$.ajax({
			url: 'db/config.json?ts='+(new Date()).toISOString(),
			dataType: 'json',
			cache: false,
			success: function (Config) {
				_this.Config = Config;
				for (var i in Config) _this.addMenuItem(i);
			},
			error: function (req, emsg, ecode) {
				jSystatWebBody.append(
					$('<pre />').append(emsg).append(ecode)
				);
			}
		});
	});
})();
