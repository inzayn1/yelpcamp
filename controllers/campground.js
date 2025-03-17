const Campground = require('../models/campground');
const { cloudinary } = require("../cloudinary");
const mbxGeocoding = require('@mapbox/mapbox-sdk/services/geocoding')
const mapBoxToken = process.env.mapbox_token;
const geoCoder = mbxGeocoding ({accessToken: mapBoxToken});

module.exports.index = async(req,res)=>{
    const campgrounds = await Campground.find({});
    res.render('campgrounds/index', { campgrounds })
}

module.exports.renderNewForm = (req,res)=>{
    res.render('campgrounds/new')
}

module.exports.createNewCamp = async(req,res,next)=>{
    // if(!req.body.campground) throw new ExpressError('Invalid Campground Data', 404);
    const geoData = await geoCoder.forwardGeocode({
        query: req.body.campground.location,
        limit: 1
    }).send()
    const campground = new Campground(req.body.campground);
    campground.geometry = geoData.body.features[0].geometry;
    campground.images = req.files.map(f => ({url: f.path, filename: f.filename}));
    campground.author = req.user._id;
    await campground.save();
    console.log(campground)
    req.flash('success', 'successfully made a new campground!')
    res.redirect(`/campgrounds/${campground._id}`)
}

module.exports.showCampground = async(req,res,)=>{
    const campground = await Campground.findById(req.params.id).populate({
       path: 'reviews',
       populate:{
        path: 'author'
       }
    }).populate('author');
    // console.log(campground)
    if(!campground){
        req.flash('error', 'Cannot find the campground!')
        return res.redirect('/campgrounds');
    }
    res.render('campgrounds/show', {campground });
}

module.exports.rendereditCampground = async(req,res,)=>{
    const campground = await Campground.findById(req.params.id)
    if(!campground){
        req.flash('error','Cannot find the Campground!');
        return res.redirect('/campgrounds')
    }
    res.render('campgrounds/edit', {campground});
}

module.exports.deleteCampground = async(req,res)=>{
    const { id } = req.params; 
    await Campground.findByIdAndDelete(id);
    req.flash('success', 'successfully deleted campground')
    res.redirect('/campgrounds');
}
module.exports.editCampground = async(req,res) => {
    const { id } = req.params; 
    console.log(req.body)
    const campground = await Campground.findByIdAndUpdate(id, {...req.body.campground}, { new: true })
    if (req.files && req.files.length > 0) {
        const imgs = req.files.map(f => ({ url: f.path, filename: f.filename }));
        campground.images.push(...imgs);
    }
    if (req.body.deleteImages) {
        for (let filename of req.body.deleteImages) {
            await cloudinary.uploader.destroy(filename);
        }
        await campground.updateOne({ $pull: { images: { filename: { $in: req.body.deleteImages } } } })
    }
    await campground.save();
    req.flash('success', 'successfully updated')
    res.redirect(`/campgrounds/${campground._id}`)
}
