** The Forge Compendium Library Integration **

The Forge Compendium Library offers the option for third party developers who wish to have their compendium shown within the module the opportunity to do this through the use of a few simple flags and additional .json files to describe the folder structure of the compendium.

**_ The flags _**

```
"flags":{
    "forge-compendium-browser":{
        "active":true,
        "background":"url to the image used for the background on the books homepage",
        "cover":"url used when displaying to compendium in the library"
        }
    }
```

The only one of those flags that is required is the `active` property, set to true. This indicates that the compendium should be loaded into the Forge Compendium Library. The other two properties are for images to be displayed and although optional, really should be included.

**_ The directory structure _**

For v10 and earlier, the only way to include a folder structure was to provide it manually. Either through entries in the module.json, or through a separate file called `folders.json`. With v11, and the inclusion of a folder structure within the compendium, adding this structure is unecessary.
