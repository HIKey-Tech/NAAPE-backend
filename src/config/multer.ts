import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "./cloudinary";
import path from "path";

const generatePublicId = (file: Express.Multer.File) => {
    // Remove extension and special chars, keep base name; add timestamp for uniqueness
    const name = path.parse(file.originalname).name.replace(/[^a-zA-Z0-9-_]/g, "_");
    const timestamp = Date.now();
    return `${name}-${timestamp}`;
};

const storage = new CloudinaryStorage({
    cloudinary,
    params: async (_req, file) => ({
        folder: "naape-images/",
        allowed_formats: ["jpg", "jpeg", "png", "webp"],
        public_id: generatePublicId(file),
        
    }),
});

const profileImageStorage = new CloudinaryStorage({
    cloudinary,
    params: async (_req, file) => ({
        folder: "profile/",
        allowed_formats: ["jpg", "jpeg", "png", "webp"],
        public_id: generatePublicId(file),
        transformation: [
            {
                width: 400,
                height: 400,
                crop: "fill",
                gravity: "face",
                quality: "auto",
                fetch_format: "auto",
            },
        ],

    })
})


// Multer starts from here

export const uploadProfileImage = multer({
    storage: profileImageStorage,
    limits: { fileSize: 8 * 1024 * 1024 }, 
    fileFilter: (req, file, cb) => {
        const accepted = /jpeg|jpg|png|webp/;
        const ext = path.extname(file.originalname).toLowerCase();
        const mime = file.mimetype;
        if (accepted.test(ext) && accepted.test(mime)) {
            cb(null, true);
        } else {
            cb(new Error("Only image files (jpg, jpeg, png, webp) are allowed!"));
        }
    },
});

export const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, 
    fileFilter: (req, file, cb) => {
        const accepted = /jpeg|jpg|png|webp/;
        const ext = path.extname(file.originalname).toLowerCase();
        const mime = file.mimetype;
        if (accepted.test(ext) && accepted.test(mime)) {
            cb(null, true);
        } else {
            cb(new Error("Only image files (jpg, jpeg, png, webp) are allowed!"));
        }
    },
});
