

// Basic Project Configuration
// see  the docs for more info: https://docs.basic.tech
export const config = {
	name: "test-two",
	project_id: "bd1e08c6-25d0-44eb-bf5a-53922874b5e8"
  };
  
  export const schema = {
		  "project_id": "bd1e08c6-25d0-44eb-bf5a-53922874b5e8",
		  "tables": {
			  "foo": {
				  "fields": {
					  "bar": {
						  "indexed": true,
						  "type": "string"
					  }
				  },
				  "type": "collection"
			  }
		  },
		  "version": 1
	  };
  