import React, { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { AuthService, Place } from '../services/authService';

const ReviewScreen = () => {
    const [review, setReview] = useState<Place[] | null> (null );

    useEffect(() => {
        const fetchReview = async () => {
            const review = await AuthService.placesFetch('atm');
            setReview(review);
        };
        fetchReview();
    }, []);

    const showReview = () => {

    }

    return (
        <View>
            <View>
                <Text>Đánh giá địa điểm</Text>
            </View>
            {review? (
                review.map((r, index) => (
                    <Text key={index}> {r.long} {r.lat}</Text>
                ))
            ) : (
                <Text>Đang tải...</Text>
            )}
        </View>
    );
}
export default ReviewScreen;
