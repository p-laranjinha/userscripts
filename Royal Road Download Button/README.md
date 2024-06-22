# About

This script adds a "Download Chapters" button next to the already existing buttons (such as "Follow" or "Donate") to all fictions and "Download Chapter" buttons to every chapter on the [Royal Road website](https://www.royalroad.com).

When the button is pressed, the script scrapes the chosen chapters of the fiction into easily readable .html files, and packages them into a .zip file.

The .html files contain styling to emulate Royal Road's default dark mode (with font size 16 due to personal preference), and working previous/next chapter buttons on desktop using the [file URI scheme](https://en.wikipedia.org/wiki/File_URI_scheme).

There are some options you can change in your userscript manager:

- If you want to use the **chapter's publish date**, or the **chapter ID in the chapter's URL** as the filename prefix.
  - The filename prefix is used to keep the downloaded files in the correct order.
- If you want to download the images included in the chapters as well.
  - If an error ocurred while fetching an image and it couldn't be downloaded, you can find the error in the console.
  - If you find this takes too much storage space, you can later delete the images and it will fall back to the online images.

# How to access the files on Android

## Using the [file URI scheme](https://en.wikipedia.org/wiki/File_URI_scheme)

It mostly works like on desktop, using a **file://** link on a browser, but I found that to access those links on Android, they either need to be a bookmark or your homepage.

Additionally, due to Android's increased restrictions, you'll need to use a tool like **adb** to find the internal storage and SD card locations. In my case, my internal storage was on **file:///sdcard/**, but my SD card required additional permissions to access which I was unable to grant to my browser.

## Using other apps

The apps I recommend are ones like [**HTTP File Server (+WebDAV)** by slowscript](https://play.google.com/store/apps/details?id=slowscript.httpfileserver), that create a small server in your phone so that you can access your files using any browser.

You might be able to find an app made specifically for viewing HTML files if you look hard enough, but it may not work with the Previous/Next buttons or with downloaded images.

# Other info

If you want the file names to use incremental numbers as the prefix, the last version that did this is [v4.8](https://greasyfork.org/en/scripts/466670-royal-road-download-button?version=1367939).

Tags: Royal Road, RoyalRoad, RR, Web Novel, royalroad.com

---

![Image of the button on a fiction page](https://github.com/p-laranjinha/userscripts/raw/master/Royal%20Road%20Download%20Button/images/fiction_button.png)
![Image of the button on the top of a chapter page](https://github.com/p-laranjinha/userscripts/raw/master/Royal%20Road%20Download%20Button/images/chapter_top_button.png)
![Image of the button on the bottom of a chapter page](https://github.com/p-laranjinha/userscripts/raw/master/Royal%20Road%20Download%20Button/images/chapter_bottom_button.png)
![Image of the options in violentmonkey](https://github.com/p-laranjinha/userscripts/raw/master/Royal%20Road%20Download%20Button/images/options.png)
