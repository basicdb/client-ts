
// Basic Project Configuration
// see  the docs for more info: https://docs.basic.tech
export const config = {
  name: "testproject",
  project_id: "edf4539a-e2e6-403c-8dec-7267565ce46d"
};

export const schema = {
		"project_id": "edf4539a-e2e6-403c-8dec-7267565ce46d",
		"tables": {
			"hello": {
				"fields": {
					"hello": {
						"indexed": true,
						"type": "string"
					}
				},
				"type": "collection"
			},
			"test": {
				"fields": {
					"test": {
						"indexed": true,
						"type": "string"
					}
				},
				"type": "collection"
			}, 
			"foo" : { 
				"origin" : { 
					"type": "reference", 
					"project_id": "bd1e08c6-25d0-44eb-bf5a-53922874b5e8",
					"table": "foo"
				},
				"fields": {
					"bar": {
						"indexed": true,
						"type": "string"
					}
				},
				"type": "collection"
			}
		},
		"version": 2
	};
