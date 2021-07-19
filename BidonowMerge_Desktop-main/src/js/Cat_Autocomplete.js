// create autocomplete instance for sub-category search
app.autocomplete('#sub-categories-autocomplete', {
	sourceUrl: '../data/categories.min.json',
	sourceType: 'json',
	maxShowingResults: 20,
	sourceItemsPath: function(data) {
		return data.childs;
	},
	renderResultRowText: function(row, data, origin) {
		var allParents = origin.parents;
		var rowParentsIDs = row.parent_categories;
		var parentsNames = [];

		for (var i = 0; i < rowParentsIDs.length; i++) {
			if (rowParentsIDs[i] in allParents) {
				parentsNames.push(allParents[ rowParentsIDs[i] ].name);
			}
		}

		return row.name + (parentsNames.length ? ' ('+parentsNames.join(', ')+')' : '');
	},
	renderResultRowIcon: function(row, data, origin) {
		var allParents = origin.parents;
		var rowParentsIDs = row.parent_categories;
		var iconSource = '';

		if (rowParentsIDs.length && rowParentsIDs[0] in allParents) {
			iconSource = allParents[ rowParentsIDs[0] ].icon;
		}

		return iconSource ? DOM('img', {src: '../images/icons/'+iconSource}) : null;
	}
});