app.Views.widgetView = Backbone.View.extend({
	tagName: 'div',
	className: 'widget',

	initialize: function () {

		this.bookTemplate = window.bookTemplate;
		this.widgetTemplate = window.widgetTemplate;
		this.confirmTemplate = window.confirmTemplate;

		this.render = _.bind(this.render, this);
		this.model.bind('change:height', this.updateHeight, this);
	},
	events: {
		'drop' : 'drop',
		"tableRendered": 'makeItResizable',
		"click button.minimize_button": "minimize",
		"click button.maximize_button": "maximize",
		"click button.full_button": "full",
		"click button.half_button": "half",
		"click button.close_button": "close",
		"click button.params_button_white": "openParams",
		"click div.activity": "endOfTime",
		"change:numberOfLines": 'render'
	},
	drop: function(event, index) {
		this.$el.trigger('update-sort', [this.model, index]);
	},  

	render: function() {
		var html = _.template(this.widgetTemplate, this.model.attributes);

		this.$el[0].innerHTML =html;

		if(this.model.get('halfed') === true) this.$el.addClass('half');
		else this.$el.addClass('full');

		if(this.model.get('type') == "events" && typeof this.viewEvents != "undefined") {
			this.viewEvents.setElement(this.$el.find('.content')).render();
		}
		this.makeItResizable();

		this.$el.find('.activity').animate({rotate: '-180deg'}, 400, 'easeInOutQuad');
		this.$el.find('.activity').animate({rotate: '0deg'}, 0, 'easeInOutQuad');

		return this;
	},

	//function exectuted by collection view after adding content to dom the first time
	postRender: function() {
		var that = this;

		this.makeItResizable();

		if(this.model.get('minimized')) this.$el.appendTo('#widgetsMinified>div');
	
		if(this.model.get('type') == "events") {
			// creating a view for the events collection set in this widget model
			this.viewEvents = new app.Views.eventCollectionView({el: that.$el.find('.content'), collection: this.model.get('events')});
		}

		//first time only, because managetime update himself
		this.manageTime();
	},

	makeItResizable: function() {
		var contentObj = this.$el;
		if(contentObj.length<1) return false;

		if(this.resizable) contentObj.resizable( "destroy" );

		var that = this;
		contentObj.resizable({
			start: function() {
				//desactivate animation else we have big latency
				that.toogleAnimations();
			},
			handles: "s",
			minHeight: 150,
			alsoResize: that.$el.find('tbody'),
			stop: function() {
				var newHeight = $(this).find('tbody').height();
				that.model.set('height', newHeight);

				//reininit
				$(this).css({'width': '','height': ''});
				$(this).find('tbody').css('width', '');

				if($(this).hasClass('half')) that.resizeNeighbour(newHeight, $(this));

				//desactivate animation else we have big latency
				that.toogleAnimations();
			}
		});
		this.resizable = true;
		this.updateHeight();
	},

	toogleAnimations: function() {
		var val;
		var el = this.$el.find('tbody');
		if(this.animationDisabled) {
			val = 'height 0.3s'; 
			this.animationDisabled = false;
		}
		else {
			val = 'none';
			this.animationDisabled = true;
		}

		this.$el.find('tbody').css('-webkit-transition', val);
		this.$el.find('tbody').css('-moz-transition', val);
		this.$el.find('tbody').css('transition', val);
	},

	resizeNeighbour: function(newHeight, el) {
		//apply on neighbour
		if(el.hasClass('lineBegin')) {
			var neighbour = this.model.nextElement();
			if(neighbour) if(neighbour.get('halfed')==true) neighbour.set('height', newHeight);
		}
		else {
			var neighbour = this.model.previousElement();
			if(neighbour) if(neighbour.get('halfed')==true) neighbour.set('height', newHeight);
		}
	},

	manageTime: function() {
		clearTimeout(this.timeoutObject);
		clearInterval(this.intervalObject);
		this.dateBegin = new Date();
		this.timeout = new Date();
		this.timeout.setMinutes(this.timeout.getMinutes() + this.model.get('duration'));

		var sec = (this.timeout - new Date()) / 1000;

		var that = this
		this.timeoutObject = setTimeout(function() {
			that.endOfTime();
		}, sec*1000);

		//display
		var that = this;
		this.intervalObject = setInterval(function(){that.updateTimeDisplay()}, 1000);
	},
	endOfTime: function() {
		this.model.jsonGetWidget()
		this.manageTime();
	},
	updateTimeDisplay: function() {
		var sec = (this.timeout - new Date()) / 1000;
		var duration = (new Date() - this.dateBegin)/1000;

		if (sec > 0) {
			mn = Math.floor (sec / 60);
			sec = Math.floor (sec - (mn * 60));
		}

		this.$el.find('.time')[0].innerText = Math.max(Math.round(mn), 0) + ':'+("0" + Math.max(Math.round(sec), 0)).slice(-2);

		var height = this.$el.find('.activity').height()-2;
		var duration = (new Date() - this.dateBegin)/1000;

		//produit en x
		this.$el.find('.activity_sand').css({'-webkit-transform': 'scaleY('+(duration*height)/(this.model.get('duration')*60)+')'});
	},

	updateHeight:function() {
		this.$el.find('tbody').css('height', this.model.get('height'));
	},

	minimize: function() {
		//animation
		var that = this;
		this.$el.animate({top: -$('#widgets').height()*2}, 300, 'easeInExpo', function() {
			$('#widgetsMinified>div').append(that.el);
			$('#widgets .widget:first-child').trigger('refresh-order');

			that.model.set('minimized', true);
			that.model.collection.view.changeMinimized();
		}).animate({top: $('#widgetsMinified').height()*2}, 0).animate({top: 0}, 300, 'easeOutExpo', function() {
	});

		
	},
	maximize: function() {
		//animation
		var that = this;
		this.$el.animate({top: $('#widgetsMinified').height()*2}, 300, 'easeInExpo', function() {
			// i want to insert it at its normal position :
			// first get all elements which are not minimized
			var tmp = that.model.collection.filter(function(widget) {
				return (widget.get('minimized') === false && widget.get('order')<that.model.get('order'));
			});
			//insert after last element of this filtered table (or in first place if talbe void)
			if(tmp.length > 0) that.$el.insertAfter(_.last(tmp).get('view').$el);
			else $('#widgets>div').prepend(that.el);
			that.$el.trigger('refresh-order');
		}).animate({top: -$('#widgets').height()*2}, 0).animate({top: 0}, 300, 'easeOutExpo', function() {
			that.model.set('minimized', false);
			that.model.collection.view.changeMinimized();
		});

	},
	full: function() {
		this.model.set('halfed', false);
		this.$el.removeClass('half').addClass('full'); this.$el.trigger('refresh-order');

		this.model.set('height', this.model.get('height')*1.5986);
	},
	half: function() {
		this.model.set('halfed', true);
		this.$el.removeClass('full').addClass('half'); this.$el.trigger('refresh-order');

		this.model.set('height', this.model.get('height')/1.5986);
	},
	close: function() {
		if(confirm(this.confirmTemplate))
			{ this.remove(); this.$el.trigger('refresh-order');}
	},
	openParams: function() {
		$( "#param_form" ).dialog({
			height: 690,
			width: 815,
			modal: true,
			buttons: [
				{
					text:  window.labelCancel,
					click: function() {
						$( this ).dialog( "close" );
					}
				},
				{
					text: window.labelValidate,
					click: function() {
						var valid = true;
						allFields.removeClass( "ui-state-error" );
	 
						forgottenPassword(fg_name.val(), fg_email.val());
					}
				}
			],
			close: function() {
				tips.innerHTML = '';
				allFields.val("").removeClass( "ui-state-error" );
			}
		});
	},
	waiting: function() {
		this.$el.animate({'opacity': 0.6}, 100);
	},
	endWaiting: function() {
		this.$el.animate({'opacity': 1}, 300);
	}
});


app.Views.widgetCollectionView = Backbone.View.extend({
	initialize: function() {
		this.$el.sortable({
			tolerance: "pointer",
			placeholder: "placeholder",
			handle: ".name",
			opacity: 0.8,
			distance: 2,
			cancel: ".activity",
			cursor: "move",
			start: function( event, ui ) {
				var that= $(ui.helper);
				var w = that.innerWidth()-10;
				var h = that.innerHeight();
				$('.placeholder').css({'width': w, 'height': h});
			},
			stop: function(event, ui) {
				ui.item.trigger('drop', ui.item.index());
			}
		}).disableSelection();
	},

	events: {
		'update-sort': 'updateSort',
		'refresh-order': 'refreshOrder'
	},
	render : function() {
		// Clear out this element.
		$(this.el).empty();
 
		this.collection.each(this.appendModelView, this);

		this.refreshOrder();
		this.changeMinimized();
	},
	appendModelView: function(model) {
		var view = new app.Views.widgetView({model: model});
		var el = view.render().el;
		model.set('view', view);
		this.el.appendChild(el);
		view.postRender();
	},
	updateSort: function(event, model, position) {
		this.collection.remove(model);

		this.collection.each(function (model, index) {
			var ordinal = index;
			if (index >= position)
				ordinal += 1;
			model.set('order', ordinal);
		});
		
		model.set('order', position);
		this.collection.add(model, {at: position});
		
		// to update ordinals on server:
		var ids = this.collection.pluck('id');

		this.refreshOrder();
	},

	refreshOrder: function() {
		var i = 0;
		$('#widgets .widget').each(function(){
			var $this = $(this);
			if($this.hasClass('half')) {
				if(i % 2 == 0) $this.removeClass('lineEnd').addClass('lineBegin');
				else $this.removeClass('lineBegin').addClass('lineEnd');
				i++;
			}
			else if($this.hasClass('full')) {
				//reinit compter
				i = 0;
			}
		});
	},

	changeMinimized: function () {
		if(this.collection.where({minimized: true}).length >0) {
			$('#widgetsMinified').removeClass('hidden');
			$('#widgetsHeader_buttons').addClass('hidden');
		}
		else {
			$('#widgetsMinified').addClass('hidden');
			$('#widgetsHeader_buttons').removeClass('hidden');
		}
	}
});

app.Views.eventView = Backbone.View.extend({
	tagName: 'tr',
	className: 'event',
	childrenReduced: false, 

	initialize: function () {
		this.eventTemplate = window.eventTemplate;
		this.render = _.bind(this.render, this);
	},
	events: {
		//'drop' : 'drop',
		"click td:not(.groups,.checkbox)": "showActions",
		"click td.groups": "reducechildren"
	},
	render: function() {
		this.model.checkgroups();

		var content = _.template(this.eventTemplate, this.model.attributes);

		this.$el[0].innerHTML = content;

		this.$el.addClass('state'+this.model.get('s'));
		if(this.model.get('ch').length > 0) this.$el.addClass('hasChildren');
		this.$el.attr('data-id', this.model.id);

		this.generateSLABars();

		return this;
	},

	showActions: function(e) {
		createContextual(e, this.model.get('actionsAvailable'));
	},

	reducechildren: function() {
		//check if this line has child(ren)
		if(!this.model.get('ch')>0) return false;

		var children = this.model.get('ch');
		if(!this.childrenReduced) {
			//reduce them
			for (var i=0; i<children.length; i++) {
				this.model.collection.get(children[i]).get('view').reduce();
				this.childrenReduced = true;
				this.$el.find('td.groups').text('+');
			}
		}
		else {
			//unreduce them
			for (var i=0; i<children.length; i++) {
				this.model.collection.get(children[i]).get('view').unreduce();
				this.childrenReduced = false;
				this.$el.find('td.groups').text('-');
			}
		}
	},

	reduce: function (){
		this.$el.hide(200);
	},
	unreduce: function (){
		this.$el.show(200);
	},

	generateSLABars: function () {
		this.$el.find(".sla_bar").each(function() {
			$(this).progressbar({
				value: $(this).data('progression')
			});
		});
	}

});

app.Views.eventCollectionView = Backbone.View.extend({
	currentSelectionForArbo: null,
	renderHTML: '',
	eltbody: null,
	initialize: function() {
		this.eventHeaderTemplate = window.eventHeaderTemplate;

		this.render = _.bind(this.render, this);
		//this.collection.on('add remove', this.render);
		//this.collection.bind('remove', this.render);
		// (called in widget.jsonGetWidget) instead
	},
	render : function() {
		// Clear out this element.
		this.clear();

		this.eltbody = this.el.getElementsByTagName('tbody')[0];
		this.collection.each(this.renderModelView, this);

		this.makeSortable();

		this.$el.trigger('tableRendered')
	},
	renderModelView: function(model) {
		var view = new app.Views.eventView({model: model});
		var el = view.render().el;
		model.set('view', view);
		//adding in JS for better performances
		this.eltbody.appendChild(el);
	},
	clear: function() {
		this.$el[0].innerHTML =this.eventHeaderTemplate;
		this.collection.clearMetas();
	},
	makeSortable: function() {
		var that = this;
		this.$el.find('tbody').sortable({
			axis: "y",
			opacity: 0.8,
			// handle: "td.groups",
			helper: "clone",
			cursor: "move",
			cancel: ".table_header, .hasChildren",
			start: function(event, ui) {
				that.currentSelectionForArbo = null;
				ui.placeholder.hide();
				ui.item.show();
			},
			change: function(event, ui) {
				ui.placeholder.hide();
				var top = ui.position.top;
				for (var i = 0; i < that.collection.length; i++) {
					var over = that.collection.models[i].get('view').$el
					if(top>over.position().top && top<over.position().top+over.height()) {

						if(that.collection.models[i].get('p')==null)
							{ over.addClass('overForArbo'); that.currentSelectionForArbo = that.collection.models[i];
						}
					} else over.removeClass('overForArbo');
				}
				if($('.overForArbo').length==0) that.currentSelectionForArbo = null;
			},
			stop: function(event, ui) {
				that.onStopSortable(ui)
			}
		});
	},
	onStopSortable: function(sortResult) {
		this.$el.find('tr').removeClass('overForArbo');
		if(this.currentSelectionForArbo === null) {
			//re-render
			this.render();
			return false;
		}

		var that = this;
		if(this.currentSelectionForArbo.get('ch').length<=0)
			$( "#merge_form" ).dialog({
				autoOpen: true,
				dialogClass: "no-close",
				height: 180,
				width: 350,
				modal: true,
				resizable: false,
				buttons: [
					{
						text: window.labelMergeCancel,
						class: "button-cancel button-icon",
						click: function() {
							//re-render
							that.render();
							$(this).dialog("close");
						}
					},
					{
						text: window.labelMergeValidate,
						class: "button-validate button-icon",
						click: function() {
							that.afterStopSortable(sortResult);
							$(this).dialog("close");
						}
					}
				],
				close: function() {
					$( "#merge_form input" ).val("");
				}
			});

		else this.afterStopSortable(sortResult);

	},
	afterStopSortable: function(sortResult) {
		var tmp = this.collection.changeFiliation(sortResult.item.attr('data-id'),
												this.currentSelectionForArbo.id);

		//re-render
		if (tmp) this.render();
	}
});

app.Views.bookView = Backbone.View.extend({
	renderHTML: '',
	pageNumber: 1,

	initialize: function() {
		this.pageTemplate = window.pageTemplate;
		this.instructionTemplate = window.instructionTemplate;
		this.perimeterTemplate = window.perimeterTemplate;

		this.render = _.bind(this.render, this);
		this.model.bind('change:contractsByDate', this.render);
	},

	render: function () {

		this.renderHTML = '';
		var contracts = this.model.getByDate();

		//for each date, render pages
		var that = this;
		_.each(contracts, function(page) {
			that.renderPages(page)
		});

		//render it
		this.$el[0].innerHTML =this.renderHTML;


		//animate book
		$('#book>div').booklet({
			width: 863,
			height: 556,
			pagePadding: 0,
			pageNumbers: false,
			speed: 500,
			hoverWidth: 20,
			hoverSpeed: 200,
			hash: true,
			prev: ".previous_button",
			next: ".next_button"
		});
	},

	renderPerimeters: function(perimeters) {
		var tmp='';
		var that = this;
		_.each(perimeters, function (perimeter) {
			tmp+= _.template(that.perimeterTemplate, perimeter);
		});
		return tmp;
	},

	renderPages: function(pages) {
		var that = this;
		_.each(pages, function (page) {
			page.perimeterList = that.renderPerimeters(page.perimeters);
			page.pageNumber = that.pageNumber;
			that.renderHTML+= _.template(that.pageTemplate, page);
			that.pageNumber++;
		});
	}
});




