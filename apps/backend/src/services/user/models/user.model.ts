import mongoose, {Schema, Types, model} from "mongoose";

export interface IUser extends Document {
    username: string
    email: string
    mobile?: string
    password: string
    friendList: Types.ObjectId[]
    pronouns?: string | null
    status?: string | null
    bio: string | null
    dateOfBirth: Date | null
    profilePicture: {
        url: string | null;
        public_id: string | null;
    }
    coverPicture: {
        url: string | null;
        public_id: string | null;
    }
    isBanned: boolean
    isActive: boolean
    banExpiry: Date | null
    banType: 'temporary' | 'permanent' | null
    createdAt: Date
    updatedAt: Date
}

const userSchema: Schema<IUser> = new Schema (
    {
        username: {
            type: String,
            required: true,
            trim: true,
            unique: true,
            minlength: 3
        },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true
        },
        mobile: {
            type: String
        },
        password: {
            type: String,
            required: true,
            minlength: 8
        },
        pronouns: {
            type: String,
            default: null
        },
        friendList: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
            }
        ],
        bio: {
            type: String,
            default: null
        },
        status: {
            type: String,
            default: null
        },
        profilePicture: {
            url: {
                type: String,
                default: null,
            },
            public_id: {
                type: String,
                default: null,
            },
        },
        coverPicture: {
            url: {
                type: String,
                default: null,
            },
            public_id: {
                type: String,
                default: null,
            },
        },
        isActive: {
            type: Boolean,
            default: true
        },
        banType: {
            type: String,
            enum: ['temporary', 'permanent'],
            default: null
        },
        dateOfBirth: {
            type: Date,
            // required: true
        },
        isBanned: {
            type: Boolean,
            default: false
        },
        banExpiry: { 
            type: Date, 
            default: null,  
        },
            

    },
    {
        timestamps: true
    }
)

export  const UserModel = model<IUser>("User", userSchema)