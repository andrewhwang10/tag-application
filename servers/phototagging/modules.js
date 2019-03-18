var Photo = require("./photo.js");
var Tag = require("./tag.js");
var multiparty = require('multiparty');
const fs = require('fs');
var path = require('path');
// var async = require('async');

// var PhotoResponse = {
//     photoID: String,
//     data: String,
//     likes: Number,
//     tags: []
// }

function getUserID(req, res) {
    let user = req.get("X-User");
    if (!user) {
        return ""
    }
    console.log(user)
    let userID = String(JSON.parse(user).id)
    return userID;
}

function photos(req, res, next) {
    let xUserID = getUserID(req, res);
    if (xUserID.length == 0) {
        res.status(403).send("User is not authenticated")
    }
    
    console.log("X-UserID: " + xUserID)

    // TODO: Send multiple photos in one response
    switch (req.method) {
        case "GET":
            console.log("INSIDE PHOTOS")
            Photo.find( { $or: [{'tags.members': xUserID }, {creator: xUserID}] }).then(function(photos) {
                photoResponses = []
                for (i = 0; i < photos.length; i++) {
                    photo = photos[i]
                    url = photo.url
                    tagNames = []
                    for (j = 0; j < photo.tags.length; j++) {
                        tagNames.push(photo.tags[j].name)
                    }
                    // fs = new FileStream(url, FileMode.Open);
                    // photoBytes = new byte[fs.length]
                    // fs.Read(photoBytes, 0, photoBytes.length);

                    // photoBytes = new Buffer(fs.readFileSync(url)).toString("base64") // returns STRING representation of ARRAY?
                    photoBytes = Buffer.from(fs.readFileSync(url)).toString("base64") // returns STRING representation of ARRAY?

                    photoRes = {
                        photoID: photo._id,
                        data: photoBytes,
                        likes: photo.likes.length,
                        tags: tagNames
                    }
                    photoResponses.push(photoRes)  
                }
                console.log("photoResponses: " + photoResponses)
                res.status(200).send(photoResponses)

            }).catch(next);
            break;

            // console.log("INSIDE PHOTOS")
            // Photo.findOne( { $or: [{'tags.members': xUserID }, {creator: xUserID}] }).then(function(photo) {
            //     // res.status(200).json(photos)
            //     url = photo.url
            //     readStream = fs.createReadStream(url);
            //     res.status(200)
            //     readStream.pipe(res);
            // }).catch(next);
            // break;

            /*
            // TODO: Send photo to client in GATEWAY (using URLS) instead of this microservice?
            Photo.find({}).then(function(photos) {
                if (!photo) {
                    res.send("Photo doesn't exist!");
                }
                if (photo.creator != xUserID) {
                    console.log("User is NOT creator; checking tags now")
                    for (i = 0; i < photo.tags.length; i++) {
                        tag = photo.tags[i]
                        if (tag.members.includes(xUserID)) {
                            // res.status(200).send(photo)
                            readStream = fs.createReadStream(photo.url);
                            res.status(200)
                            readStream.pipe(res);
                        }
                    }
                } else {
                    // res.status(200).send(photo)
                    readStream = fs.createReadStream(photo.url);
                    res.status(200)
                    readStream.pipe(res);
                }
                res.status(403).send("You cannot view this photo")
            });
            
            // { $or: [{privateChannel: false}, {privateChannel: true, members: xUserID}] }
            Photo.find({}, function(err, photos) {
                res.status(200).json(photos);
            }).catch(next);
            break;
            */

        case "POST":
            var form = new multiparty.Form();
            form.parse(req, function(err, fields, files) {
                if (err) {
                    console.log("ERROR IN FORM.PARSE: " + err)
                    return;
                }
                console.log(fields.type)
                console.log(files.uploadFile + "length: " + files.uploadFile.length)
                console.log(xUserID)

                formFields = fields
                formFiles = files.uploadFile

                console.log("formFiles INSIDE FORM.PARSE!!!: " + formFiles)

                var photoObjects = []
                var defaultPaths = []

                // Handle multiple files in upload
                for (i = 0; i < formFiles.length; i++) {
                    console.log("FILE " + i + "!")
                    
                    file = formFiles[i]
                    defaultPath = file.path
                    defaultPaths.push(defaultPath)
                    defaultPhotoName = path.basename(defaultPath)
    
                    originalPhotoName = file.originalFilename
    
                    newPath = "/photos/" + defaultPhotoName
                    console.log("newPath: " + newPath)

                    var newPhoto = new Photo();
                    newPhoto.url = newPath;
                    newPhoto.originalPhotoName = originalPhotoName
                    newPhoto.likes = []
                    // TODO: Add only userID
                    newPhoto.creator = xUserID;
                    newPhoto.createdAt = Date.now();
                    newPhoto.editedAt = Date.now();
                    console.log(newPhoto)

                    photoObjects.push(newPhoto)
                }

                for (i = 0; i < photoObjects.length; i++) {
                    fs.copyFile(defaultPaths[i], photoObjects[i].url, (err) => {
                        if (err) throw err;
                    });
                }

                // console.log("photoObjects: " + photoObjects)

                // var savedPhotos = []

                // async.forEachOf(photoObjects, function(photoObj, index, callback) {
                //     console.log("IN ASYNC")
                    // Photo.findOne({originalPhotoName: photoObjects[0].originalPhotoName}).then(function(photo) {
                        //if (!photo) {
                            photoObjects[0].save().then(function(savedPhoto) {
                                console.log("Saved photo: " + savedPhoto)
                                res.status(201).json(savedPhoto)
                                // savedPhotos.push(savedPhoto)
                                // channelToSend = createChannelEvent(CHANNEL_NEW, channel, false);
                                // sendToQueue(channelToSend);

                                // fs used to be here

                                // res.status(201).json(savedPhoto);
                            }).catch(next);
                        //} else {
                            // console.log("Photo named " + photoObjects[0].originalPhotoName + " already exists")
                            
                        // }
                    // }).catch(next);
                // }, function (err) {
                //     if (err) {
                //         res.send("ERR IN ASYNC: " + err.message);
                //     }
                    // res.json(savedPhotos)
                // });
            });
            break;
        default:
            res.send("Method is not allowed");
    }
}

// CHeck if user is creator of tag or member of it
function photosByTag(req, res, next) {
    let xUserID = getUserID(req, res);
    if (xUserID.length == 0) {
        res.status(403).send("User is not authenticated")
    }
    let tagID = req.params.tagID;

    switch (req.method) {
        case "GET":
            Tag.findOne({ _id: tagID }).then(function(tag) {
                if (!tag) {
                    res.send("Tag doesn't exist");
                }
                Photo.find({ $or: [{'tags.members': xUserID }, {creator: xUserID}], tags: tag }).then(function(photos) {
                    res.status(200).json(photos);
                }).catch(next);
            }).catch(next);
            break;
        default:
            res.send("Method not allowed")
    }
}

// /photos/:photoID
// /photos/:photoID/:tagID
function specificPhoto(req, res, next) {
    let xUserID = getUserID(req, res);
    if (xUserID.length == 0) {
        res.status(403).send("User is not authenticated")
    }
    console.log("INSIDE SPECIFIC USER")
    let photoID = req.params.photoID;
    let tagID = req.params.tagID;

    switch (req.method) {
        // TODO: TEST!
        case "GET":
            Photo.findOne({ _id: photoID}).then(function(photo) {
                if (!photo) {
                    res.send("Photo doesn't exist!");
                }
                if (photo.creator != xUserID) {
                    console.log("User is NOT creator; checking tags now")
                    for (i = 0; i < photo.tags.length; i++) {
                        tag = photo.tags[i]
                        if (tag.members.includes(xUserID)) {
                            // res.status(200).send(photo)
                            readStream = fs.createReadStream(photo.url);
                            res.status(200)
                            readStream.pipe(res);
                        }
                    }
                } else {
                    // res.status(200).send(photo)
                    readStream = fs.createReadStream(photo.url);
                    res.status(200)
                    readStream.pipe(res);
                }
                res.status(403).send("You cannot view this photo")
            });
            break;
        
        // Change from POST to PATCH?
        // TODO: TEST
        case "POST":
            Photo.findOne({_id: photoID}).then(function(photo) {
                if (!photo) {
                    res.send("Photo doesn't exist!");
                }
                if (!tagID) {
                    // currentLikes = photo.likes
                    // console.log("currentLikes (photo.likes): " + currentLikes + ", length of " + currentLikes.length + ", type " + typeof(currentLikes))
                    // updatedLikes = []
                    // if (currentLikes.includes(xUserID)) {
                    //     i = currentLikes.indexOf(xUserID)
                    //     updatedLikes = currentLikes.splice(i, 1)
                    // } else {
                    //     updatedLikes = currentLikes.push(xUserID)
                    // }

                    currentLikes = String(photo.likes)
                    updatedLikes = []
                    if (currentLikes.length == 0) {
                        currentLikes = []
                    } else {
                        currentLikes = currentLikes.replace(", ", ",").split(",")
                    }
                    if (currentLikes.includes(xUserID)) {
                        i = currentLikes.indexOf(xUserID)
                        updatedLikes = currentLikes.splice(i, 1)
                    } else {
                        updatedLikes = currentLikes.push(xUserID)
                    }
                    console.log("updatedLikes: " + updatedLikes)
                    
                    Photo.findOneAndUpdate({_id: photoID}, { $set: {editedAt: Date.now(), likes: updatedLikes}}, {new: true}, (err, updatedPhoto) => {
                        if (err) {
                            res.send("Error: Couldn't update (like/unlike) photo: " + err);
                        } else {
                            // channelToSend = createChannelEvent(CHANNEL_UPDATE, channel, false);
                            // sendToQueue(channelToSend);
                            res.json(updatedPhoto);
                        }
                    });
                } else {
                    console.log("CREATOR of photo: " + xUserID)
                    if (photo.creator != xUserID) {
                        res.status(403).send("You are not the creator of this photo.");
                    }

                    Tag.findOne({_id: tagID}).then(function(tag) {
                        // SHOULDN'T CONTINUE IF PHOTO CREATOR != TAG CREATOR
                        if (tag.creator != xUserID) {
                            res.status(403).send("You are not the creator of this tag.");
                        }
                        console.log("Add tag to photo: " + tag)
                        
                        photoTags = String(photo.tags)
                        if (photoTags.length == 0) {
                            photoTags = []
                        } else {
                            photoTags = photoTags.replace(", ", ",").split(",")
                        }
                        photoTags.push(tag)
                        console.log("photoTags: " + photoTags)

                        Photo.findOneAndUpdate({_id: photoID}, {editedAt: Date.now(), tags: photoTags}, {new: true}, (err, updatedPhoto) => {
                            if (err) {
                                res.send("Error: Couldn't update (add tag to) photo: " + err);
                            } else {
                                // channelToSend = createChannelEvent(CHANNEL_UPDATE, channel, false);
                                // sendToQueue(channelToSend);
                                res.json(updatedPhoto);
                            }
                        });
                        }).catch(next);
                    
                }
                
            });
            break;
            
        case "DELETE":
            Photo.findOne({_id: photoID}).then(function(photo) {
                if (!photo) {
                    res.send("Photo doesn't exist!");
                }
                if (photo.creator != xUserID) {
                    res.status(403).send("You are not the creator of this photo.");
                }
                if (!tagID) {
                    Photo.deleteOne({_id: photoID}, function(err) {
                        if (err) {
                            res.send("Error: Could not delete tag from photo: " + err)
                        }
                        res.status(200).send("Deleted photo")
                    }).catch(next);
                } else {
                    Photo.findOneAndUpdate({_id: photoID}, { $pull: {"tags": tagID}, editedAt: Date.now()}, {returnNewDocument: true}, (err, updatedPhoto) => {
                        if (err) {
                            res.send("Error: Couldn't remove tag from photo: " + err)
                        }
                        res.status(200).send(updatedPhoto)
                    }).catch(next);
                }
            }).catch(next);
            break;

        default:
            res.send("Method not allowed")
    }
}

// /tags
function tags(req, res, next) {
    let xUserID = getUserID(req, res);
    if (xUserID.length == 0) {
        res.status(403).send("User is not authenticated")
    }
    switch (req.method) {
        case "GET":
            Tag.find({ $or: [{members: xUserID}, {creator: xUserID}] }, function(err, tags) {
                if (err) { 
                    res.send("Error getting tags: " + err)
                } else {
                    res.status(200).json(tags);
                }
            }).catch(next);
            break;
        case "POST":
            var form = new multiparty.Form();

            form.parse(req, function(err, fields, files) {
                if (err) {
                    console.log("ERROR IN TAGS FORM.PARSE")
                    return;
                }

                mem = String(fields.members).replace(" ", "")
                mem = mem.split(",")
                console.log("mem: " + mem)

                console.log(fields)
                console.log(fields.name[0])
                
                var newTag = new Tag();
                newTag.name = fields.name[0]

                // TODO: Revisit here to add members!!! Need to be comma separated
                newTag.members = mem
                newTag.creator = xUserID;
                newTag.createdAt = Date.now();
                newTag.editedAt = Date.now();

                newTag.save().then(function(savedTag) {
                    res.status(201).json(savedTag)
                }).catch(next);
            });
            break;
        default:
            res.send("Method not allowed")
    }
}

// /tags/:tagID
// TODO: TEST Deleting and then getting tags
function specificTag(req, res, next) {
    xUserID = getUserID(req, res)
    if (xUserID.length == 0) {
        res.status(403).send("User is not authenticated")
    }
    tagID = req.params.tagID;

    switch (req.method) {
        case "GET":
            Tag.findOne({_id: tagID}).then(function(tag) {
                if (!tag) {
                    res.send("Tag doesn't exist!");
                } else {
                    // if (!tag.members.includes(xUserID)) {
                    //     res.status(403).send("You are not a registered viewer of any tags on this photo.");
                    // } else {
                        res.status(200).json(tag)
                    // }
                }
            }).catch(next);
            break;
        case "DELETE":
            Tag.findOne({_id: tagID}).then(function(tag) {
                if (!tag) {
                    res.send("Tag doesn't exist!");
                } else if (tag.creator != xUserID) {
                    res.send("You are not the creator of this tag!")
                } else {
                    Tag.deleteOne({_id: tagID}, function(err) {
                        if (err) {
                            res.send("Error: Could not delete tag: " + err)
                        } else {
                            Photo.updateMany({tags: tagID}, { $pull: {tags: tagID}})
                            res.status(200).send("Deleted tag")
                            // eventToSend = createChannelEvent(CHANNEL_DELETE, channel, true)
                            // sendToQueue(eventToSend);
                        }
                    }).catch(next);
                }

                // Tag.find({tags: tagID}, function (err, tags) {
                    //{editedAt: Date.now(), tags: updatedTags}
                    // or tag._id
                    // {new: true},
                    // no need array filters?
                    // Photo.updateMany({tags: tagID}, { $pull: {tags: tagID}})
                //  }).catch(next);
                /*
                updatedTags = photo.tags.push(tag) // change this to delete

                Photo.findOneAndUpdate({_id: photoID}, {editedAt: Date.now(), tags: updatedTags}, {new: true}, (err, updatedPhoto) => {
                    if (err) {
                        res.send("Error: Couldn't update (add tag to) photo: " + err);
                    } else {
                        // channelToSend = createChannelEvent(CHANNEL_UPDATE, channel, false); 
                        // sendToQueue(channelToSend);
                        res.json(updatedPhoto);
                    }
                });
                */

                // check if user is creator
                // if (!tag.members.includes(xUserID)) {
                //     res.status(403).send("You are not a registered viewer of any tags on this photo.");
                // } else {
                    // res.status(200).send("Tag has been deleted")
                // }  
            }).catch(next);
            break;
        default:
            res.send("Method not allowed")
    }
}

// /tags/:tagID/:userID
function specificTagMembers(req, res, next) {
    xUserID = getUserID(req, res)
    if (xUserID.length == 0) {
        res.status(403).send("User is not authenticated")
    }
    tagID = req.params.tagID;
    userID = req.params.userID;

    switch (req.method) {
        // ERROR: Adding and removing twice??
        // TODO: Check if user is already member
        case "POST":
            // currentMembers = channel.members
            // memberIdInt = parseInt(member.id, 10)
            // if (member.id == null || member.id.length == 0 || isNaN(memberIdInt)) {
            //     res.send("User is invalid, cannot add as member")
            // } else if (currentMembers.includes(memberIdInt)) {
            //     res.send("User is already a member");
            // } else {
            //     currentMembers.push(memberIdInt);
            //     members = {"members": currentMembers}

            
            Tag.findOneAndUpdate({_id: tagID}, { $push: {"members": userID}, editedAt: Date.now()}, {returnNewDocument: true}, (err, tag) => {
                if (err) {
                    res.send("Error: Couldn't add to members: " + err)
                }
                res.status(201).send(tag)
            }).catch(next);
            break;
        case "DELETE":
            Tag.findOneAndUpdate({_id: tagID}, { $pull: {"members": userID}, editedAt: Date.now()}, {returnNewDocument: true}, (err, tag) => {
                if (err) {
                    res.send("Error: Couldn't delete from members: " + err)
                }
                res.status(201).send("User was removed as member from tag")
            }).catch(next);
            break;
        default:
            res.send("Method not allowed")
    }
}


exports.photos = photos
exports.specificPhoto = specificPhoto
exports.photosByTag = photosByTag
exports.tags = tags
exports.specificTag = specificTag
exports.specificTagMembers = specificTagMembers