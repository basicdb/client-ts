export const schema = {
    project_id: '5a15ffd6-89fe-4921-a1a0-e411ecd6da97',
    namespace: 'todos',
    version: 0,
    tables: {
        todos: {
            name: 'todos',
            type: 'collection',
            fields: {
                id: {
                    type: 'string',
                    primary: true,
                },
                title: {
                    type: 'string',
                    indexed: true,
                },
                completed: {
                    type: 'boolean',
                    indexed: true,
                }
            }
        },
    }
} 

