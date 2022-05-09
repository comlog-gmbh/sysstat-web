window.SysstatWeb = new (function () {
	var
		_this = this,
		jSystatWebNav,
		jSystatWebContent,
		jSystatWebTitle,
		jSystatWebBody
	;

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

	this.parseData = function (date, data) {
		var lines = data.split("\n"), line, res = {}, bar, ts;
		for (var i=0; i < lines.length; i++) {
			line = lines[i].replace("\r", '').replace(".value", '').split(" ");
			if (line.length < 2) continue;

			bar = line[1];
			ts = date+' '+line[0];
			if (typeof res[ts] == 'undefined') res[ts] = {};
			res[ts][bar] = line[2]
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
						data = _this.parseData(ts, data);
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


	this.viewTitle = function (id, config, fromTime, toTime) {
		var fromTime = this.fromTime(fromTime);
		var toTime = this.toTime(toTime);

		var fromTimeInput = $('<input type="datetime-local" name="fromTime">')
			.addClass('form-control form-control-sm d-inline-block')
			.val(fromTime.toISOString().substring(0, 16))
		;

		var toTimeInput = $('<input type="datetime-local" name="toTime">')
			.addClass('form-control form-control-sm d-inline-block')
			.val(toTime.toISOString().substring(0, 16))
		;

		var _change = function () {
			_this.viewBody(id, config, fromTimeInput.val(), toTimeInput.val());
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

	this.viewBody = function (id, config, fromTime, toTime) {
		fromTime = this.fromTime(fromTime);
		toTime = this.toTime(toTime);

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

			for (var time in data) {
				config.data.labels.push(time);
				for (var bar in data[time]) {
					var index = dsmap[bar];
					if (typeof index !== "undefined") {
						if (!config.data.datasets[index].data) config.data.datasets[index].data = [];
						config.data.datasets[index].data.push(data[time][bar]);
					}
				}
			}

			var jCanvas = $('<canvas id="myChart" class="w-100 h-75"></canvas>');
			jSpinner.replaceWith(jCanvas);

			var myChart = new Chart(
				jCanvas[0],
				config
			);
		});
	};

	this.view = function (id, config, fromTime, toTime) {
		this.viewTitle(id, config, fromTime, toTime);
		this.viewBody(id, config, fromTime, toTime);
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

	this.addMenuItem = function(id, config) {
		var jMenu = this.addMenuCat(config.category);
		jMenu.append(
			$('<a />')
				.addClass("list-group-item")
				.text(config.title)
				.data('id', id)
				.data('config', config)
				.click(function () {
					var jThis = $(this);
					_this.view(jThis.data('id'), jThis.data('config'));
				})
		)
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
				for (var i in Config) {
					_this.addMenuItem(i, Config[i]);
				}
			},
			error: function (req, emsg, ecode) {
				jSystatWebBody.append(
					$('<pre />').append(emsg).append(ecode)
				);
			}
		});
	});
})();