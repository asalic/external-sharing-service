# External sharing service

## Description

The external sharing service is used to allow the users to get data from the platform.
Right now, it supports the following ways of sharing data:
- via a file sent to the user's current email provided in Keycloak


Each user is identified by an unique API token stored by Keycloak.
This token should not be made available to anyone, since can be used to impersonate the actual owner.

## Installation

The server needs node version 18 or later to be installed on the platform, along with current versions of npm and npx.

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

In order to run the application you need a JSON config file.
You can start by using the template provided by `config-example.json` in the root of the Github repository to get started.
Once you have the configuration prepared, use npm to run the server and pass the config file use the **s** command line argument:

```
npm run prod -- -s <your config path>
```

## Usage

The web service exposes a REST API described in the **API** subsection.
We provide a script to simplify the upload task, more details in the **Upload script** subsection.

### API Token

The API token is a base 64 encoded string representation of a JSON object with the following format:
```
{
    "userId": "ab09c866-44cb-411d-b4e5-66a54484b423"
    "secret": "JP0SeMDwtz"
}
```

The __userId__ field represents the unique ID given to  a user by Keycloak  when the account is created.
The __secret__ is a secure, randomly generated string, unique to each user on the system.
The base 64 representation of a user's API token is stored in the __attributes/external_sharing_service_api_token__ property of a Keycloak user. 

### API (/api/v1)

For all operations requiring authentication, you can use one of the following:
- an API token set in the request header "authorization: apitoken \<your token\>" 


The following API paths are available (do not forget to prepend the common prefix /api/v1):
- ```/result/email```

    Authorization required. Upload a file as form binary data with the file content in a field called "file" and send it via email (dynamically obtained from Keycloak -- if the user changes the email and then calls the web service, the system sends the file to the new address). 


The response returned by the server (barring a catastrophic system error where the code of the web service can't control the response) should always be a JSON with the following format:
```
{
    "statusCode": <number>
    "message": <null | string>
}
```

### Upload script

The `upload-result` script available in the bin folder of the repository allows the upload of one file (which is specified by a command line parameter right after the name of the script itself) with a simple command:

```
upload-result <full path to your file>
```

Please bear in mind that you need two predefined environment variables, EXTERNAL_SHARING_SERVICE_API_TOKEN and EXTERNAL_SHARING_SERVICE_URL, for the command to work.
The former holds your API token as defined in Keycloak, while the latter is the full root URL of the web service (e.g. https://localhost:8443)
The answer returned by the web server in JSON format is printed  on the console as output, allowing straightforward handling (e.g. use it in a workflow).
