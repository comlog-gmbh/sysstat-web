window.SysstatWeb = new (function () {
	var
		_this = this,
		jSystatWebNav,
		jSystatWebContent,
		jSystatWebTitle,
		jSystatWebBody
	;
	this.Config = {};

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

	this.getDatasheet = function (id, ds_id) {
		if (this.Config[id] && this.Config[id].data && this.Config[id].data.datasets) {
			for (var i=0; i < this.Config[id].data.datasets.length; i++) {
				if (this.Config[id].data.datasets[i].id == ds_id) {
					return this.Config[id].data.datasets[i];
				}
			}
		}
		return null;
	};

	this.parseData = function (id, date, data) {
		//var config = this.Config[id];
		//var base = config.base || 1;
		var last_val = {}, ds, value;
		var lines = data.split("\n"), line, res = {}, bar, ts;
		for (var i=0; i < lines.length; i++) {
			line = lines[i].replace("\r", '').replace(".value", '').split(" ");
			if (line.length < 2) continue;

			bar = line[1];
			ts = date+' '+line[0];
			if (typeof res[ts] == 'undefined') res[ts] = {};
			ds = this.getDatasheet(id, bar);
			value = line[2];
			if (ds && ds.datatype && ds.datatype.toLowerCase() == 'derive') {
				if (typeof last_val[bar] == 'undefined') last_val[bar] = value;
				value = value - last_val[bar];
				last_val[bar] = value;
			}

			res[ts][bar] = value;
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
			fromTime.setHours(fromTime.getHours() - 24);
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
	 * @param {(any) => void} cb
	 */
	this.load = function(id, fromTime, toTime, cb) {
		fromTime = this.fromTime(fromTime);
		toTime = this.toTime(toTime);

		var dates = [this.toDateString(fromTime)];
		var toDateNum = this.toDateNumber(toTime);
		var nextDay = new Date(fromTime.getTime());
		while (this.toDateNumber(nextDay) < toDateNum) {
			nextDay.setHours(nextDay.getHours() + 24);
			dates.push(this.toDateString(nextDay));
		}

		var StatData = {};
		var _q = function () {
			if (dates.length > 0) {
				var ts = dates.shift();
				var opts = {
					url: 'db/'+id+'.'+ts+'.db?ts='+(new Date()).toISOString(),
					cache:false,
					success: function (data) {
						data = _this.parseData(id, ts, data);
						$.extend(StatData, data);
						_q();
					},
					error: function (err, type, message) {
						if (typeof console != "undefined") console.warn('db/'+id+'.'+ts+'.db: '+message);
						_q();
					}
				};
				$.ajax(opts);
				return;
			}

			cb(StatData);
		}

		// Get db data
		_q();
	};

	this.viewTitle = function (id, fromTime, toTime) {
		var fromTime = this.fromTime(fromTime);
		var toTime = this.toTime(toTime);
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

		var jSpinner = this.spinner();
		jSystatWebBody.html(jSpinner);

		this.load(id, fromTime, toTime, function (data) {
			var dsmap = {};

			config.data.labels = [];
			for (var i=0; i < config.data.datasets.length; i++) {
				dsmap[config.data.datasets[i].id] = i;
				if (!config.data.datasets[i].borderColor) {
					config.data.datasets[i].borderColor = _this.stringToColor(config.data.datasets[i].id);
					config.data.datasets[i].backgroundColor = config.data.datasets[i].borderColor;
				}
			}

			var last_label = null, cur_label = null, length = Object.keys(data).length;
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
					config.data.labels.push(time);
					last_label = cur_label;
				}
				else {
					config.data.labels.push('');
				}*/

				config.data.labels.push(time);
				for (var bar in data[time]) {
					var index = dsmap[bar];
					if (typeof index !== "undefined") {
						if (!config.data.datasets[index].data) config.data.datasets[index].data = [];
						config.data.datasets[index].data.push(data[time][bar]);
					}
				}
			}

			var jCanvas = $('<canvas id="myChart" class="w-100"></canvas>');
			jSpinner.replaceWith(jCanvas);

			var myChart = new Chart(
				jCanvas[0],
				config
			);
		});
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
				.addClass("list-group-item")
				.text(config.title)
				.data('id', id)
				.attr('data-id', id)
				.click(function () {
					_this.view(this.getAttribute('data-id'));
				})
		)
		return true;
	};

	$(function () {
		jSystatWebNav = $('#SystatWebNav');
		jSystatWebContent = $('#SystatWebContent');
		jSystatWebTitle = $('#SystatWebTitle');
		jSystatWebBody = $('#SystatWebBody');

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