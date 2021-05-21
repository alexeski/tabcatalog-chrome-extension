// 1
// from fields
const form = document.querySelector('.form-data');
const serverUrl = document.getElementById('server_url');
const site = document.getElementById('site');
const pat_name = document.getElementById('pat_name');
const pat_value = document.getElementById('pat_value');
const graphql_query = document.getElementById('graphql_query_input');

// results
const errors = document.querySelector('.errors');
const loading = document.querySelector('.loading');
const results = document.querySelector('.result-container');
const clearBtn = document.querySelector('.clear-btn');
const exportJsonBtn = document.querySelector('.exportJson-btn');
const graphql_query_used = document.querySelector('.graphql_query_used');
const metadata_api_response = document.querySelector('.metadata_api_response');
var responseData;

// sample query to use during dev & testing 
const myQuery = `query workbooks_and_views {
    views {
      workbook {
        id
        luid
        projectName
      }
      luid
      id
      name
      index
      path
      createdAt
      updatedAt
    }
  }
  `

// 6
// API call
import axios from '../node_modules/axios';

async function tableauSignIn(serverUrl, site, pat_name, pat_value) {
    // Sign in on the Tableau Rest API and store the auth-token for later use by Metadata API
    if (localStorage.getItem('tableauToken') === null) {
        console.log('will try to sign in on the Tableau Rest Api now..')
        const response = await axios.post(serverUrl + '/api/3.11/auth/signin', {
            "credentials": {
                "personalAccessTokenName": pat_name,

                "personalAccessTokenSecret": pat_value,
                "site": {
                    "contentUrl": site
                }
            }
        });
        localStorage.setItem('tableauToken', response.data.credentials.token);
    }
}

async function fetchTableauMetadata(serverUrl, site, pat_name, pat_value, graphql_query) {
    try {
        if (localStorage.getItem('tableauToken') === null) {
            await tableauSignIn(serverUrl, site, pat_name, pat_value);
        }
        var tableauAuthToken = localStorage.getItem('tableauToken');

        // request data from Tableau Metadata API
        await axios.get(serverUrl + '/api/metadata/graphql', {
                params: {
                    query: graphql_query,
                },
                headers: {
                    'X-Tableau-Auth': tableauAuthToken,
                },
            })
            .then((response) => {
                loading.style.display = 'none';
                form.style.display = 'none';
                graphql_query_used.textContent = graphql_query;
                metadata_api_response.innerHTML = syntaxHighlight(response.data);
                responseData = response.data.data; //save this in a variable, so it can be exported to json
                results.style.display = 'block';
                clearBtn.style.display = 'block';
                exportJsonBtn.style.display = 'block';
            });
    } catch (error) {
        console.log(error);
        if (error != null) {
            // TODO: better error handling. Now on any errors we try to sign in again and retry the data fetch
            console.log('will try to sign in again and fetch data');
            localStorage.removeItem('tableauToken');
            fetchTableauMetadata(serverUrl, site, pat_name, pat_value, graphql_query);
        }

    }
}

// Auxiliary function to format the GraphQL JSON response
function syntaxHighlight(json) {
    if (typeof json != 'string') {
        json = JSON.stringify(json, undefined, 2);
    }
    json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
        var cls = 'number';
        if (/^"/.test(match)) {
            if (/:$/.test(match)) {
                cls = 'key';
            } else {
                cls = 'string';
            }
        } else if (/true|false/.test(match)) {
            cls = 'boolean';
        } else if (/null/.test(match)) {
            cls = 'null';
        }
        return '<span class="' + cls + '">' + match + '</span>';
    });
}

// Aux function to export to JSON
function exportToJsonFile(jsonData) {
    console.log('exporting json');
    let dataStr = JSON.stringify(jsonData);
    let dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

    let exportFileDefaultName = 'data.json';

    let linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
}

// 5
// Set the api key and region for the user
function setUpVariablesAndFetchData(serverUrl, site, pat_name, pat_value, graphql_query) {
    localStorage.setItem('serverUrl', serverUrl);
    localStorage.setItem('site', site);
    localStorage.setItem('pat_name', pat_name);
    localStorage.setItem('pat_value', pat_value);
    localStorage.setItem('graphqlQuery', graphql_query);

    loading.style.display = 'block';
    errors.textContent = '';
    // fetch data
    fetchTableauMetadata(serverUrl, site, pat_name, pat_value, graphql_query);

}

// 4
// manage the form submission
function handleSubmit(e) {
    e.preventDefault();
    setUpVariablesAndFetchData(serverUrl.value, site.value, pat_name.value, pat_value.value, graphql_query.value);
}

// 3 
// initial checks
function init() {
    const storedServerUrl = localStorage.getItem('serverUrl');
    const storedSite = localStorage.getItem('site');
    const storedPat_name = localStorage.getItem('pat_name');
    const storedPat_value = localStorage.getItem('pat_value');
    const storedGraphql_query = localStorage.getItem('graphqlQuery');

    // show the form
    form.style.display = 'block';
    results.style.display = 'none';
    loading.style.display = 'none';
    clearBtn.style.display = 'none';
    exportJsonBtn.style.display = 'none';
    errors.textContent = '';

    // pre-populate text boxes with anything eventually available from local storage
    serverUrl.value = (storedServerUrl ? storedServerUrl : null);
    site.value = (storedSite ? storedSite : null)
    pat_name.value = storedPat_name;
    pat_value.value = storedPat_value;
    graphql_query.value = storedGraphql_query;

};

function reset(e) {
    e.preventDefault(); //???
    init();
};

// 2
// set the listeners and start of the app
form.addEventListener('submit', (e) => handleSubmit(e));
clearBtn.addEventListener('click', (e) => reset(e));
exportJsonBtn.addEventListener('click', () => exportToJsonFile(responseData));
init();

// 7 (not in use)
// dynamic extension icon color

//     chrome.runtime.sendMessage({
//         action: 'updateIcon',
//         value: {
//             color: closestColor
//         }
//     });
// }