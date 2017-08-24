# cf2tf: Cloudflare to Terraform

A Terraform importer for Cloudflare resources inspired by [terraforming](https://github.com/dtan4/terraforming).

## Installation
```
git clone https://github.com/brave/cf2tf
npm install -g
```
## Prerequisites
You must export your Cloudflare credentials:
```
export CLOUDFLARE_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
export CLOUDFLARE_EMAIL=xxx@xxx.xxx
```

## Usage
```
$ cf2tf --help
Commands:
  dns  import dns records

Options:
  --help  Show help                                                    [boolean]
  --tfstate  output tfstate                                     [default: false]
```

```
$ cf2tf dns --help
cf2tf dns

Options:
  --help     Show help                                                 [boolean]
  --tfstate  output tfstate                                     [default: false]
  --zone     limit to a particular zone by name                    [default: ""]
```

### Example
The following example shows simulated output for a domain `mysite.com`
which has a single record, an apex CNAME to `mysite.org`
```
$ cf2tf dns --zone mysite.com > main.tf
$ cat main.tf
{
    "resource": {
        "cloudflare_record": {
            "mysite_com_CNAME_mysite_org": {
                "domain": "mysite.com",
                "name": "mysite.com",
                "value": "mysite.org",
                "type": "CNAME",
                "proxied": false
            }
        }
    }
}
$ cf2tf dns --zone mysite.com --tfstate > terraform.tfstate
$ cat terraform.tfstate
{
    "version": 1,
    "serial": 1,
    "modules": [
        {
            "path": [
                "root"
            ],
            "outputs": {},
            "resources": {
                "cloudflare_record.mysite_com_CNAME_mysite_org": {
                    "type": "cloudflare_record",
                    "depends_on": [],
                    "primary": {
                        "id": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
                        "attributes": {
                            "domain": "mysite.com",
                            "hostname": "mysite.com",
                            "id": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
                            "name": "mysite.com",
                            "priority": "0",
                            "proxied": "false",
                            "ttl": "1",
                            "type": "CNAME",
                            "value": "mysite.org",
                            "zone_id": "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
                        },
                        "meta": {
                            "schema_version": "1"
                        },
                        "tainted": false
                    },
                    "deposed": [],
                    "provider": ""
                }
            },
            "depends_on": []
        }
    ]
}
```

## Notes

Unlike terraforming, cf2tf outputs in the [Terraform JSON configuration
format](https://www.terraform.io/docs/configuration/syntax.html). This can
easily converted to hcl format via a tool like [json2hcl](https://github.com/kvz/json2hcl).
