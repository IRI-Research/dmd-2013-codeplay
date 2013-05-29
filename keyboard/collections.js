app.Collections.widgets = Backbone.Collection.extend({
	model: app.Models.widget,
	comparator: function(model) {
		return model.get('order');
	}
});

app.Collections.events = Backbone.Collection.extend({
	sortAttr: "id",
	model: app.Models.event,
	initialize: function() {
		this.clearMetas();
	},

	// "sort" comparator functions take two models, and return -1 if the first model should come before the second, 0 if they are of the same rank and 1 if the first model should come after
	comparator: function(event1, event2) {
		return false; // comment if you want the collection to be organised with this.sortAttr

		// in order to compare if a event must be sort before or after, we will do so :
		// PS  : we have a sort attr which indicate with what attribute we sort

		// first we check if the two events are parent or child of the other
		//  if so, the parent is always before the child, even if the child's attribute is stronger

		// second, we check if the two events are brothers
		//  if so, we must check their own attrs and decide directly

		// third, we know now than the two events are not in the same family
		//  we must check their parents (if they have one) attributes to decide, because families must stays grouped

		//if event1 is parent of event2
		if(event1.id == event2.get('p')) return -1;
		if(event1.get('p') == event2.id)  return 1;

		// now we know no parent/child relation between them, so check brotherwood
		if(event2.has('p')) {

			var brothersOf2 = this.get(event2.get('p')).get('ch');
			// if event 1 is a brother of 2
			if (brothersOf2.indexOf(event1.id)>=0) {
				//so direct check
				if(event2.get(this.sortAttr)>event1.get(this.sortAttr)) return -1;
				return 1;
			}
		}
		//no need to do with brothersOf1 because the reverse of this demo is true

		// ok no family. check on parents' sortAttr.

		// if event 2 has a parent, check his parent sortAttr instead
		var checked2 = event2;
		if(event2.has('p')) checked2 = this.get(event2.get('p'));

		// same for parent 1.
		var checked1 = event1;
		if(event1.has('p')) checked1 = this.get(event1.get('p'));

		if (checked2.get(this.sortAttr)>checked1.get(this.sortAttr)) return -1;
		return 1;
	},
	meta: function(prop, value) {
		if (value === undefined) {
			return this._meta[prop]
		} else {
			this._meta[prop] = value;
		}
	},
	clearMetas: function () {
		this._meta = {};
	},

	//must return true if filliation has been changed and re-rendering is needed, false otherwise
	changeFiliation: function(modelId, newParentId, description) {

		var model = this.get(modelId);
		var previousParent = this.get(model.get('p'));
		var newParent = this.get(newParentId);

		//if trying to include himself
		if (model.id == newParent.id) return false;

		// if new parent id has no children, it's not a regroupement.
		// create a regroupement with them



		//must change parent ID for the item changed
		model.set('p', newParent.id);
		// remove its id from previous parent's children
		if(typeof previousParent !== 'undefined') previousParent.set('ch', _.without(previousParent.get('ch'), model.id));
		// and add its id to its new parent's children
		newParent.set('ch', _.union(newParent.get('ch'), [model.id]));

		this.sort();

		// todo send to server

		// JsonSetGrouping
		// target : [id]
		// parent : (id || 'new' || null)

		return true;
	},

	// use widget.jsonGetWidget instead
	jsonGetEvents: function() {
		return false;
		var that = this;
		$.ajax({
			url: 'webservices/jsonGetEvents.jsf',
			success: function(data) {
				that.set(JSON.parse(data));
				that.view.render();
			}
		});
	}

});

