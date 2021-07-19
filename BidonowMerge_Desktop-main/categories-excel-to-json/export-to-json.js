// Get from table all non-empty rows as array format
// return [['COL1', 'COL2', 'COL3'], ['COL1', 'COL2', 'COL3'],
const getTableRowsAsArray = function(tableElement) {

	// if table element not send - return empty array
	if (!tableElement) {
		console.log('no table element send');
		return [];
	}

	// get tbody rows elements
	const rows = tableElement.querySelectorAll('tbody > tr');

	// create results array for formatted rows data
	const rowsArray = [];

	for (let i in rows) {
		// get current row from loop
		const row = rows[i];

		// if rows dont have children or have it less then 3 - skipping it
		if (!row.children || row.children.length < 3) {
			continue;
		}

		// skip empty rows
		if (!row.textContent.trim()) {
			continue;
		}

		// trim all text in cells
		const cells = Array.from(row.children).map(child => child.textContent.trim());

		// add cells to results array
		rowsArray.push(cells);
	}

	return rowsArray;
}

// filtering childs items by name ASC and return filtering array
const sortChildsByNameASC = function(items) {
	// if items are not array or its empty - return empty array
	return Array.isArray(items) ? items.sort((a, b) => {
		let nameA = a.name.toLowerCase(); // convert name from first item to lower case
		let nameB = b.name.toLowerCase(); // convert name from second item to lower case

		return nameA < nameB ? -1 : (
			nameA > nameB ? 1 : 0
		);
	}) : [];
}

// Return parents rows from all rows array
const convertRowsArrayToData = function(rows) {

	// if input var is not array or its empty - return NULL
	if (!Array.isArray(rows) || !rows.length) {
		return null;
	}

	// All parents object
	// Template = {PARENT_ID: PARENT_NAME, PARENT_ID: PARENT_NAME..}
	const parents = {};

	// All childs object
	// Template = { CHILD_ID: {id: CHILD_ID, name: CHILD_NAME, parents: [PARENT_ID, PARENT_ID]}, ... }
	const childs = {};

	// previous parent ID in loop
	let previousParentID = null;

	for (let i = 0; i < rows.length; i++) {
		const cells = rows[i];

		// check child length, of less 3 - skip
		if (cells.length < 3) {
			return;
		}

		// if first and third column != empty and second col is empty - this is parent category
		if (cells[0] && cells[2] && !cells[1]) {

			let parentID = cells[2]; // get ID from third column
			let parentName = cells[0]; // get name from first column

			// cache current parent ID for childs use
			previousParentID = parentID;

			// check duplication of id
			if (parentID in parents) {
				console.log(`Parent category ID ${parentID} is already exist!`);
			} else {
				parents[parentID] = {
					name: parentName,
					icon: '' // add empty fields for parent icon. later manually need to add icons url
				};
			}
		}
		// if first is empty and second and third col is full - this is child category
		else if (!cells[0] && cells[1] && cells[2]) {

			if (!previousParentID) {
				console.error('Error. Child not have parent');
				break;
			}

			let childID = cells[2]; // get ID from third column

			if (!(childID in childs)) {
				childs[childID] = {
					id: childID,
					name: cells[1], // get name from second column
					parent_categories: [] // set empty array for parent IDs
				}
			}

			// add parent category to current child
			childs[childID].parent_categories.push(previousParentID);
		}
	}

	// get values from object. array return
	const childsArray = Object.values(childs);

	return {
		parents: parents,
		childs: sortChildsByNameASC(childsArray) // sort childs array by alphabet from A to Z
	};
}

// format objects data to json. if got error - return null;
const formatDataToJson = function(data, minified = false) {
	let json = null;

	try {
		json = minified ? JSON.stringify(data) : JSON.stringify(data, null, 2);
	} catch(e) {
		console.error('JSON stringify error', e);
		json = null;
	}

	return json;
}

// create json file download link
const createJsonDownloadLink = function(content, fileName, linkText) {
	// create DOM <A> tag
	const link = document.createElement('a');
	// create file Blob format
	const file = new Blob([content], {type: 'text/plain'});
	// get file size in kb
	const size = (file.size / 1024).toFixed(2);
	// set URL to <A>
	link.href = URL.createObjectURL(file);
	// set text of link
	link.innerHTML = `${linkText} (${size} kb)`;
	// make link display as block
	link.style = 'display: block;';
	// make it downloaded
	link.download = fileName;

	return link;
}

// render download links in body
const createDownloadLinks = function(resultData) {
	let prettyJSON = formatDataToJson(resultData, false);
	let minifiedJSON = formatDataToJson(resultData, true);

	// create fixed block
	const block = document.createElement('div');

	// set block style
	block.style = 'position: fixed; bottom: 50px; right: 50px; font-size: 40px; z-index: 999; background: rgba(255,255,255,0.8);';
	block.innerHTML = 'DOWNLOAD CATEGORIES';

	// add pretty json link to block
	block.appendChild(
		createJsonDownloadLink(prettyJSON, 'categories-pretty.json', 'PRETTY JSON')
	);

	// add minified json link to block
	block.appendChild(
		createJsonDownloadLink(minifiedJSON, 'categories-minified.json', 'MINIFIED JSON')
	);

	// append block to body
	document.body.appendChild(block);
}

// Fire function when all DOM was loaded
document.addEventListener('DOMContentLoaded', function() {
	// get first table element from html
	const table = document.querySelector('table');

	// get rows as array from table
	const rows = getTableRowsAsArray(table);

	// parse and convert rows array to parents and childs data
	const data = convertRowsArrayToData(rows);

	// append downloads links to body
	if (data !== null) {
		createDownloadLinks(data);
	}
});