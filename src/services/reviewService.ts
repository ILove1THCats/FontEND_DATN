import { Alert } from "react-native";

export interface NewReview {
    placeid: number,
    userid: number,
    rating: number,
    comment: string,
    time: string
}

const API_URL = "http://192.168.56.1:3000/api/reviews";

export const ReviewService = {
    getLike: async (placeId: number) : Promise<number> => {
        try {
            if (placeId === 0){
                return 0;
            }
            const res = await fetch(`${API_URL}/like_place?placeId=${placeId}`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json"
                }
            });

            if (!res.ok) {
                console.error("Không lấy like được, lỗi là:", res.status);
                return 0;
            }

            const data = await res.json();

            return typeof data === "number" ? data : 0;;
        } catch (error) {
            console.error("Lỗi là:", error);
            return 0;
        }
    },

    likeUp: async(userid:number, placeid:number) => {
        try {
            if (placeid === 0){
                return 0;
            }
            const res = await fetch(`${API_URL}/uplike`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ userid, placeid })
            });

            if(!res.ok) {
                console.log("Not okay, bro :(");
            }

        } catch (error) {
            console.error("Lỗi là:", error);
            return null;
        }
    },

    reviewFetch: async(placeId:number) => {
        try {
            if (placeId === 0){
                return 0;
            }
            const res = await fetch(`${API_URL}/reviewfetch?placeId=${placeId}`, {
                method: "GET",
                headers: {  
                    "Content-Type": "application/json"
                }
            });

            if(!res.ok) {
                console.log("How can it do this to me!!!!!!!!!");
            }

            const data = await res.json();

            return Array.isArray(data) ? data : null;

        } catch (error) {
            console.error("Lỗi là:", error);
            return null;
        }
    },

    reviewUpdate: async(review: NewReview):Promise<NewReview | null> => {
        try {
            const res = await fetch(`${API_URL}/review_insert`, {
                method: "POST",
                headers: {  
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({review})
            })

            if(!res.ok) {
                console.log("How can it do this to me!!!!!!!!!");
            }

            const data = await res.json();

            return data ?? null;
        } catch (error) {
            console.error("Lỗi là: ", error);
            return null;
        }
    },


}