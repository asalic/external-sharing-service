# External sharing service

## Description

The external sharing service is used to allow the users to get data from the platform.
It supports the following ways of getting files:
- via the email provided in Keycloak by the user him(her)self

Each user is identified with a secret and unique API token stored in Keycloak.
This token should not be made available to anyone, since can be used to impersonate the actual owner.

## Installation

The server needs node version 18 or later to be available on the platform.

1. Clone the git repo

```
git clone https://github.com/chaimeleon-eu/external-sharing-service.git
```

2. Install the needed packages

```
cd external-sharing-service/
npm install
```

3. Compile the sources with npx

```
npx tsc
```

## Running

In order to run the application you need a config file in JSON format.
You can use the template provided by `config-example.json` in the root of the Github repository to get started.
Once you have the configuration prepared, use npm to run the server and pass the config file use the s flag:

```
npm run prod -- -s <your config path>
```

## Use

The web service exposes a REST API described in the next subsection.
We also provide a script to simplify the upload task, more information about it in the subsection after next. 

### API (/api/v1)

For all operations requiring authentication, you can use one of the following:
- an API token set in the request header "authorization: apitoken \<your token\>" 


The following API paths are available (do not forget to prepend the common prefix /api/v1):
- ```/result/email```

    Authorization required. Upload a file as form binary data with the file content in a field called "file" and send it via email (email dynamically obtained from Keycloak). 

### Upload script

The `upload-result` script available in the bin folder of the repository allows the upload of one file (which is specified by a command line parameter right after the name of the script itself) with a simple command:

```
upload-result <full path to your file>
```

Please bear in mind that you need two predefined environment variables, EXTERNAL_SHARING_SERVICE_API_TOKEN and EXTERNAL_SHARING_SERVICE_URL, for the command to work.
The former holds your API token as defined in Keycloak, while the latter is the full root URL of the web service (e.g. https://localhost:8443)
The answer returned by the web server in JSON format is printed as output, allowing easy handling by the user (e.g. customization or even use it further in a workflow).
