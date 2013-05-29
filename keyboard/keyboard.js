var app = {
	// Classes
	Collections: {},
	Models: {},
	Views: {},
	init: function () {
		// Initialisation de l'application ici

		Instance = {};
		Instance.collection = new app.Collections.widgets([{

			},
		]);


		Instance.collectionView = new app.Views.widgetCollectionView({
			el: '#widgets>div',
			collection: Instance.collection
		});
		Instance.collection.view = Instance.collectionView;

		Instance.collectionView.render();


		// Instance.book = new app.Models.book();

		// Instance.bookView = new app.Views.bookView({
		// 	model: Instance.book,
		// 	el: '#book>div',
		// });
		// Instance.book.getInstructions();
	}
};

$(document).ready(function () {
	// On lance l'application une fois que notre HTML est chargé
	app.init();
});

// helpers :