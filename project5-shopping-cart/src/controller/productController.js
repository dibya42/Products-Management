const productModel = require("../model/productModel")
const validator = require("../validator/validator")
const saveFile = require("../aws/aws-s3")
const moment = require("moment");

// Create Product

const createProduct = async function (req, res) {
    try {
        const requestBody = req.body;
        const requestFiles = req.files;
        // console.log(requestFiles)
        if (Object.keys(requestBody).length == 0) {
            return res.status(400).send({ status: false, message: "Enter data in body" })
        }
        if (requestBody.isDeleted) {
            return res.status(400).send({ status: false, message: `You can't create Deleted Product Please Mark IsDleted false` })
        }
        if (requestFiles.length == 0) {
            return res.status(400).send({ status: false, message: "Enter Files to be uploadp" })
        }
        const { title, description, price, currencyId, currencyFormat, availableSizes, installments, style } = requestBody //destructuring
        // validations
        if (!validator.isValidBody(title)) {
            return res.status(400).send({ status: false, message: "Enter Title Alphabets" });
        }
        if (!validator.isValidBody(description)) {
            return res.status(400).send({ status: false, message: "Enter Description" })
        }
        if (!validator.isValidBody(price) || !validator.isValidDeciNum(price)) {
            return res.status(400).send({ status: false, message: "Enter Price Any Combination of Number or Decimal" })
        }
        if (currencyId) {
            if (currencyId != "INR") {
                return res.status(400).send({ status: false, message: "Enter Currency Id Only 'INR' Either Not Enter" })
            }
        } else {
            requestBody.currencyId = "INR"
        }
        if (currencyFormat) {
            if (currencyFormat != "₹") {
                return res.status(400).send({ status: false, message: `Enter CurrencyFormate Only '₹' Either Not Enter` })
            }
        } else {
            requestBody.currencyFormat = "₹"
        }
        if (style) {
            if (!validator.isValidBody(style)) {
                return res.status(400).send({ status: false, message: "Enter valide details in style" })
            }
        }
        const size =JSON.parse(availableSizes)
        console.log(size)
        if (!validator.isValidBody(availableSizes)) {
            return res.status(400).send({ status: false, message: `Enter Any of These only "S", "XS", "M", "X", "L", "XXL", "XL"` })
        }
        else{
            for(let i=0; i<size.length; i++){
                if(!validator.isValidEnum(size[i]))
                return res.status(400).send({status: false, message: `${size[i]} not allowed!, Only enter Any of These ["S", "XS", "M", "X", "L", "XXL", "XL"]`})
            }

        }
        if (!validator.isValidBody(availableSizes) || !validator.isValidEnum(availableSizes)) {
            return res.status(400).send({ status: false, message: `Enter Any of These only "S", "XS", "M", "X", "L", "XXL", "XL"` })
        }// } else {
        //     const size = JSON.parse(availableSizes)
        //     for (let i = 0; i < size.length; i++)
        //         if (!validator.isValidEnum(size[i])) {
        //             return res.status(400).send({ status: false, message: `${size[i]} not allowed! Enter Any of These only "S", "XS", "M", "X", "L", "XXL", "XL" ` })
        //         }
        // }
        if (!validator.isValidBody(installments) || !validator.isValidInstallment(installments)) {
            return res.status(400).send({ status: false, message: "Enter installments only Number " })
        }
        if (requestBody.isDeleted) {
            requestBody.deletedAt = Date.now()
        }
        const uploadedURL = await saveFile.uploadFiles(requestFiles[0]);
        requestBody.productImage = uploadedURL;

        const existProduct = await productModel.findOne({ title: title })
        if (existProduct) {
            return res.status(400).send({ status: false, message: "Use different title" })
        }
        const createdProduct = await productModel.create(requestBody);
        res.status(201).send({ status: true, message: "Product Created SuccessFully", data: createdProduct })

    }
    catch (error) {
        res.status(500).send({ status: false, message: error.message })
    }
};


// get product by filter
const getSpecificProduct = async function (req, res) {
    try{
        let data = {isDeleted: false}
        let queryDataSize = req.query.size;
        if (queryDataSize) {
            if (!(validator.isValidBody(queryDataSize)) && (validator.isValidEnum(queryDataSize))) {
                return res.status(400).send({status: false, message:"plz Enter a valid Size"})
            }
            if(!(validator.isValidSize(queryDataSize))) {
                return res.status(400).send({status:false, message:"Please Provide Available Sizes from S,XS,M,X,L,XXL,XL"})
            }
            data["availableSizes"] = queryDataSize.trim();
        }
        let name = req.query.name;
        if (name) {
            if (!validator.isValid(name)) {
                return res.status(400).send({status: false, message:"plz enter a valid name"})
            }
            data["title"] = {$regex: name.trim()}
        }
        let priceGreaterThan = req.query.priceGreaterThan;
        if (priceGreaterThan) {
            if (!validator.isValid(priceGreaterThan)) {
                return res.status(400).send({status: false, message:"plz enter a valid name"})
            }
            data["price"] = {
                $gte: priceGreaterThan
            }
        }
        let priceLessThan = req.query.priceLessThan;
        if (priceLessThan) {
            if (!validator.isValid(priceLessThan)) {
                return res.status(400).send({status: false, message:"plz enter a valid name"})
            }
            data["price"] = {
                $lte: priceLessThan
            }
        }
        if( priceLessThan && priceGreaterThan){
            if(!validator.isValid(priceLessThan)){
                return res.status(400).send({status: false, message:"plz enter a valid price"})
            }
            if(!validator.isValid(priceGreaterThan)){
                return res.status(400).send({status: false, message:"plz enter a valid price"})
            }
            data["price"] = {$lte:priceLessThan,$gte:priceGreaterThan}
    
        }
        let filerProduct = await productModel.find(data).sort({price: req.query.priceSort})
        if (filerProduct.length === 0) {
            return res.status(400).send({
                status: true,
                message: "No product found"
            })
        }
        return res.status(200).send({
            statu: true,
            message: "products you want",
            data: filerProduct
        })
    }catch(error){
        return res.status(500).send ({status:false, message: error.message})
    }
}

//get Product by ID

const getProductById = async (req,res)=>{
    try {
        const productId  = req.params.productId
    
        if(!validator.isValidObjectId(productId)){
            return res.status(400).send({status:false, message:"Invalid product Id"})
        }
    
        const isProductExist = await productModel.findOne({_id: productId, isDeleted: false})
    
        if(!isProductExist){
            return res.status(404).send({status:false, message:"Product does not found in DB!"})
        }

        res.status(200).send({status:true, message:"Success", data:isProductExist})
        
    } catch (error) {
        res.status(500).send({status:false, message:error.message})
    }
}

//Update Product by Id

const updateProduct = async function (req, res) {
    try {
        const requestBody= req.body
        const productId = req.params.productId
        const file = req.files
        let newData = {}
        console.log(Object.keys(requestBody), file)
        
        //-------------dB call for product existance--------------------
        const productCheck = await productModel.findOne({_id: productId, isDeleted:false})
        if(!productCheck) return res.status(404).send({ status: true, message: "No product found by Product Id given in path params" })
        
        //-----------------Empty Body check------------------
        if(Object.keys(requestBody).length==0 && !file){
            return res.status(400).send({ status: false, message: "Please fill at least one area to update" })
        }
        //-----------------------Destructuring------------------------
        const{title,description,price,currencyId,currencyFormat,isFreeShipping,productImage,style,installments,isDeleted} = requestBody

        //-------------------Deleted Denied---------------------
        if (validator.isValidBody(isDeleted)) return res.status(400).send({status: false, message: "You are not allowed to perform delete Operation in update API, you need to hit Delete API"})

        // ------------------validation-------------------------
        if (validator.isValidBody(title)) {

            const titleExist = await productModel.findOne({title: title}) // DB call for title existance
            if(titleExist) return res.status(400).send({status: false, message:"This 'title' name already existes!"})
            
            if (!validator.isValidName(title)) return res.status(400).send({ status: false, message: "Please Enter a valid title should contain at least 2 characters for word formation" })
            newData['title'] = title
        }

        if (validator.isValidBody(description)) {
            if (!validator.isValidName(description)) return res.status(400).send({ status: false, message: "Please Enter a valid description, should contain at least 2 characters for word formation" })
            newData['description'] = description
        }

        if (validator.isValidBody(price)) {
            if (!validator.isValidDeciNum(price)) return res.status(400).send({ status: false, message: "Please Enter a valid price." })
            newData['price'] = price
        }

        if (currencyId) return res.status(400).send({ status: false, message:"Currency Id doesn't need to update, because it has only 'INR'(indian rupee) Option, fill other fields besides"})
        
        if (currencyFormat) return res.status(400).send({ status: false, message:"Currency Format doesn't need to update, because it has only One symbol, fill other fields besides"})

        if (validator.isValidBody(isFreeShipping)) {
            if (!validator.isValidBoolean(isFreeShipping)) return res.status(400).send({ status: false, message: "isFreeShipping needs to be a Boolean" })
            newData['isFreeShipping'] = isFreeShipping
        }

        if(file.length.value > 0){
            const uploadedURL = await saveFile.uploadFiles(file[0])
            newData['productImage'] = uploadedURL
        }
        if (validator.isValidBody(style)) {
            if (!validator.isValidName(style)) return res.status(400).send({ status: false, message: "Please Enter a valid style, should contain at least 2 characters for word formation" })
            newData['style'] = style
        }
        // if (validator.isValidBody(availableSizes)) {
        //     // if (!validator.isValidEnum(availableSizes)) return res.status(400).send({ status: false, message: 'Please SELECT a valid availableSize from list ["XS", "S", "M", "L", "X", "XL", "XXL" ]' })
        // }
        let availableSizes = JSON.parse(requestBody.availableSizes)

        if (validator.isValidBody(installments)) {
            if (!validator.isValidInstallment(installments)) return res.status(400).send({ status: false, message: "Please Enter a valid installments, upto 99 months and in 2 digits support only" })
            newData['installments'] = installments
        }
        // //--------------Check for existed name------------
        // const exixtCheck = await productModel.find({title: title})
        // if(exixtCheck) return res.status(400).send({status: true, message: "Entered 'title' already exists, Please select another title name"})
        


        //---------------Updating things---------------
        const updatething = await productModel.findOneAndUpdate(
            {_id:productId, isDeleted: false},
            {newData,$set: {availableSizes}},
            {new: true})
        // const updatething = await productModel.findOneAndUpdate(
        //     {_id:productId, isDeleted: false},
        //     {newData,$addToSet: {availableSizes}},
        //     {new: true})
        res.status(200).send({status: true, message:"Success", data: updatething})    

    }
    catch (err) {
        res.status(500).send({ status: false, message: err.message })
    }
}


//Delete product by Id

const deleteProduct = async (req, res) => {
    try {
        const productId = req.params.productId
        if (!validator.isValidObjectId(productId)) {
            return res.status(400).send({ status: true, message: "Invalid productId" })
        }

        const existProduct = await productModel.findOneAndUpdate({_id: productId, isDeleted: false }, { $set: { isDeleted: true, deletedAt: moment().format()}}, { new: true})
        if(!existProduct)
            return res.status(404).send({status: false, message:"Product doesn't exist in DB"})
        
        res.status(200).send({status: true, message: "Deleted Successfully" })

    } catch (err) {
        return res.status(500).send({ status: false,Error: err.message})
    }
}

module.exports = {createProduct, getSpecificProduct, getProductById, updateProduct, deleteProduct} 

