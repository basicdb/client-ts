//@ts-nocheck

const baseUrl = 'https://api.basic.tech';
// const baseUrl = 'http://localhost:3000';


async function get({ projectId, accountId, tableName, token }) {
    const url = `${baseUrl}/project/${projectId}/db/${accountId}/${tableName}`;
    const response = await fetch(url, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });
    return response.json();
}

async function add({ projectId, accountId, tableName, value, token }) {
    const url = `${baseUrl}/project/${projectId}/db/${accountId}/${tableName}`;
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({"value": value})
    });
    return response.json();
}

async function update({ projectId, accountId, tableName, id, value, token }) {
    const url = `${baseUrl}/project/${projectId}/db/${accountId}/${tableName}/${id}`;
    const response = await fetch(url, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({id: id, value: value})
    });
    return response.json();
}

async function deleteRecord({ projectId, accountId, tableName, id, token }) {
    const url = `${baseUrl}/project/${projectId}/db/${accountId}/${tableName}/${id}`;
    const response = await fetch(url, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });
    return response.json();
}

export { get, add, update, deleteRecord };

