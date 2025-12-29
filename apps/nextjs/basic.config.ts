
// Basic Project Configuration
// see  the docs for more info: https://docs.basic.tech
export const config = {
	name: "testproject",
	project_id: "f25f9dc0-4501-4b48-a360-bab22d35c09e"
};

export const schema = {
	"project_id": "f25f9dc0-4501-4b48-a360-bab22d35c09e",
	"tables": {
		"foo": {
			"type": "collection",
			"fields": {
				"data": {
					"type": "json",
					"indexed": true
				},
				"name": {
					"type": "string",
					"indexed": true
				},
				"count": {
					"type": "number",
					"indexed": true
				},
				"is_done": {
					"type": "boolean",
					"indexed": true
				}
			}
		}
	},
	"version": 1
};
