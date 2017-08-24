function getResourceName (recordDetails) {
  return `${recordDetails.name.replace(new RegExp('\\.', 'g'), '_')}_${recordDetails.type}_\
${recordDetails.content.replace(new RegExp('\\.', 'g'), '_')}`
}

function formatAsTf (records) {
  const output = {
    'resource': {
      'cloudflare_record': {
      }
    }
  }
  for (let recordDetails of records.result) {
    const tfDetails = {
      'domain': recordDetails.zone_name,
      'name': recordDetails.name,
      'value': recordDetails.content,
      'type': recordDetails.type,
      'proxied': recordDetails.proxied
    }
    if (recordDetails.hasOwnProperty('priority')) {
      tfDetails['priority'] = recordDetails.priority
    }
    if (recordDetails.ttl !== 1) { // Cloudflare API returns ttl of 1 when set to automatic ttl
      tfDetails['ttl'] = recordDetails.ttl
    }
    output['resource']['cloudflare_record'][getResourceName(recordDetails)] = tfDetails
  }
  return output
}

function formatAsTfstate (records) {
  const output = {
    'version': 1,
    'serial': 1,
    'modules': [
      {
        'path': [
          'root'
        ],
        'outputs': {},
        'resources': {},
        'depends_on': []
      }
    ]
  }
  for (let recordDetails of records.result) {
    const tfstateDetails = {
      'type': 'cloudflare_record',
      'depends_on': [],
      'primary': {
        'id': recordDetails.id,
        'attributes': {
          'domain': recordDetails.zone_name,
          'id': recordDetails.id,
          'name': recordDetails.name,
          'priority': '0',
          'proxied': recordDetails.proxied.toString(),
          'ttl': recordDetails.ttl.toString(),
          'type': recordDetails.type,
          'value': recordDetails.content,
          'zone_id': recordDetails.zone_id
        },
        'meta': {
          'schema_version': '1'
        },
        'tainted': false
      },
      'deposed': [],
      'provider': ''
    }
    if (recordDetails.hasOwnProperty('priority')) {
      tfstateDetails['primary']['attributes']['priority'] = recordDetails.priority.toString()
    }
    if (recordDetails.name === recordDetails.zone_name) {
      tfstateDetails['primary']['attributes']['hostname'] = recordDetails.name
    } else {
      tfstateDetails['primary']['attributes']['hostname'] = `${recordDetails.name}.${recordDetails.zone_name}`
    }
    output['modules'][0]['resources'][`cloudflare_record.${getResourceName(recordDetails)}`] = tfstateDetails
  }
  return output
}

require('yargs') // eslint-disable-line
  .command('dns', 'import dns records', (yargs) => {
    yargs.option('zone', {
      describe: 'limit to a particular zone by name',
      default: ''
    })
  }, (argv) => {
    if (!(process.env.CLOUDFLARE_EMAIL && process.env.CLOUDFLARE_TOKEN)) {
      console.log('You must define both CLOUDFLARE_EMAIL and CLOUDFLARE_TOKEN as env vars')
      return
    }
    const cf = require('cloudflare')({
      email: process.env.CLOUDFLARE_EMAIL,
      key: process.env.CLOUDFLARE_TOKEN
    })
    cf.zones.browse().then(function (zones) {
      for (let zoneDetails of zones.result) {
        if (!argv.zone || zoneDetails.name === argv.zone) {
          cf.dnsRecords.browse(zoneDetails.id).then(function (records) {
            if (argv.tfstate) {
              console.log(JSON.stringify(formatAsTfstate(records), null, 4))
            } else {
              console.log(JSON.stringify(formatAsTf(records), null, 4))
            }
          })
        }
      }
    })
  })
  .help('help')
  .option('tfstate', {
    describe: 'output tfstate',
    default: false
  })
  .argv
