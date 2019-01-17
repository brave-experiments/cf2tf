function getResourceName (recordDetails) {
  return `${recordDetails.name.replace(new RegExp('\\.', 'g'), '_')}_${recordDetails.type}_${recordDetails.id}`
}

function formatAsTf (records) {
  const output = {
    'resource': {
      'cloudflare_record': {
      }
    }
  }
  for (let recordDetails of records) {
    const tfDetails = {
      'domain': recordDetails.zone_name,
      'value': recordDetails.content,
      'type': recordDetails.type,
      'proxied': recordDetails.proxied
    }

    if (recordDetails.name === recordDetails.zone_name) {
      tfDetails['name'] = '@'
    } else {
      tfDetails['name'] = recordDetails.name.replace(new RegExp(`.${recordDetails.zone_name}$$`), '')
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
  for (let recordDetails of records) {
    const tfstateDetails = {
      'type': 'cloudflare_record',
      'depends_on': [],
      'primary': {
        'id': recordDetails.id,
        'attributes': {
          'domain': recordDetails.zone_name,
          'id': recordDetails.id,
          'hostname': recordDetails.name,
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
      tfstateDetails['primary']['attributes']['name'] = '@'
    } else {
      tfstateDetails['primary']['attributes']['name'] = recordDetails.name.replace(new RegExp(`.${recordDetails.zone_name}$$`), '')
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
    yargs.option('per_page', {
      describe: 'set number of records per page',
      default: '20'
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
    cf.zones.browse(params = {'per_page':argv.per_page}).then(function (zones) {
      for (let zoneDetails of zones.result) {
        if (!argv.zone || zoneDetails.name === argv.zone) {
          cf.dnsRecords.browse(zoneDetails.id).then(async function (firstPage) {
            let records = firstPage.result
            for (let i = 2; i <= firstPage.result_info.total_pages; i++) {
              const page = await cf.dnsRecords.browse(zoneDetails.id, {'page': i})
              records = records.concat(page.result)
            }
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
